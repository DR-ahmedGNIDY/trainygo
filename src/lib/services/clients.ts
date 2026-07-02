import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { ClientProgram } from "@/models/ClientProgram";
import { NutritionPlan } from "@/models/NutritionPlan";
import { WorkoutLog } from "@/models/WorkoutLog";
import { ProgressEntry } from "@/models/ProgressEntry";
import { CheckinResponse } from "@/models/Checkin";
import { Conversation, Message } from "@/models/Message";
import { PasswordResetLog } from "@/models/PasswordResetLog";
import { hashPassword } from "@/lib/auth/password";
import { nextClientCode } from "@/lib/codes";
import { randomString } from "@/lib/utils";
import { serialize } from "@/lib/serialize";
import { createNotification } from "./notifications";
import { normalizeGoal } from "@/lib/utils/goals";
import type {
  ClientCreateData,
  ClientUpdateData,
} from "@/lib/validations/client";

export interface GeneratedCredentials {
  username: string;
  password: string;
  code: string;
}

const monthsToMs = (m: number) => m * 30 * 86_400_000;

/** Error thrown when a coach tries to exceed their plan's client limit. */
export class ClientLimitError extends Error {
  code = "CLIENT_LIMIT_REACHED";
  constructor() {
    super("لقد وصلت إلى الحد الأقصى المسموح به في باقتك");
    this.name = "ClientLimitError";
  }
}

/**
 * Enforces a coach's plan `maxClients` limit before adding N more clients.
 * A `maxClients` of 0 means unlimited (used for legacy/trial accounts).
 */
export async function assertClientLimit(coachId: string, adding = 1) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const [profile, currentCount] = await Promise.all([
    User.findOne({ _id: coach, role: "coach" }).select("coachProfile.maxClients").lean(),
    User.countDocuments({ role: "client", "clientProfile.coach": coach }),
  ]);
  const maxClients = profile?.coachProfile?.maxClients ?? 0;
  if (maxClients > 0 && currentCount + adding > maxClients) {
    throw new ClientLimitError();
  }
}

/** List a coach's clients, scoped, with optional search + status filter. */
export async function listClients(
  coachId: string,
  opts: { query?: string; status?: "active" | "expired" | "all"; includeArchived?: boolean } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  };
  if (!opts.includeArchived) filter["clientProfile.active"] = true;
  if (opts.status && opts.status !== "all") filter.status = opts.status;
  if (opts.query) {
    const rx = new RegExp(opts.query.trim(), "i");
    filter.$or = [{ name: rx }, { "clientProfile.clientCode": rx }, { username: rx }];
  }
  const docs = await User.find(filter)
    .select("name username status clientProfile lastLoginAt createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

/** Fetch one client, scoped to the coach (returns null if not theirs). */
export async function getClient(coachId: string, clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return null;
  const doc = await User.findOne({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  }).lean();
  return doc ? serialize(doc) : null;
}

/**
 * Generates a random, code-free username (not derived from the client code),
 * retrying on the rare collision since usernames must be unique.
 */
async function generateUsername(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = `m${randomString(7).toLowerCase()}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  throw new Error("Could not generate a unique username");
}

/**
 * Create a client under a coach. The client code (TRG00001) is kept only as
 * an internal reference shown to the coach — it is never used as the
 * username or password.
 */
export async function createClient(
  coachId: string,
  input: ClientCreateData,
): Promise<{ clientId: string; credentials: GeneratedCredentials }> {
  await connectToDatabase();
  await assertClientLimit(coachId);

  const code = await nextClientCode(); // TRG00001 — internal reference only
  const username = await generateUsername();
  const password = randomString(8);
  const now = new Date();
  const subEnd = input.subscriptionMonths
    ? new Date(now.getTime() + monthsToMs(input.subscriptionMonths))
    : null;

  const client = await User.create({
    name: input.name,
    username,
    email: input.email || undefined,
    phone: input.phone,
    passwordHash: await hashPassword(password),
    role: "client",
    status: "active",
    locale: "ar",
    mustChangePassword: false,
    clientProfile: {
      coach: new Types.ObjectId(coachId),
      clientCode: code,
      age: input.age,
      gender: input.gender,
      height: input.height,
      startWeight: input.weight,
      currentWeight: input.weight,
      goal: normalizeGoal(input.goal),
      subscriptionStartDate: now,
      subscriptionEndDate: subEnd,
      active: true,
    },
  });

  await createNotification({
    recipient: coachId,
    type: "new_client",
    titleAr: `عميل جديد: ${input.name}`,
    titleEn: `New client: ${input.name}`,
    link: `/coach/clients/${client._id.toString()}`,
  });

  return {
    clientId: client._id.toString(),
    credentials: { username, password, code },
  };
}

/** Update a client's editable fields, scoped to the coach. */
export async function updateClient(
  coachId: string,
  clientId: string,
  input: ClientUpdateData,
) {
  await connectToDatabase();
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.email !== undefined) set.email = input.email || undefined;
  if (input.age !== undefined) set["clientProfile.age"] = input.age;
  if (input.gender !== undefined) set["clientProfile.gender"] = input.gender;
  if (input.height !== undefined) set["clientProfile.height"] = input.height;
  if (input.weight !== undefined) set["clientProfile.currentWeight"] = input.weight;
  if (input.goal !== undefined) set["clientProfile.goal"] = normalizeGoal(input.goal);
  if (input.active !== undefined) set["clientProfile.active"] = input.active;

  const res = await User.updateOne(
    { _id: clientId, role: "client", "clientProfile.coach": new Types.ObjectId(coachId) },
    { $set: set },
  );
  return res.matchedCount > 0;
}

/** Archive (soft-deactivate) a client. */
export async function archiveClient(coachId: string, clientId: string) {
  return updateClient(coachId, clientId, { active: false });
}

/** Restore an archived client. */
export async function restoreClient(coachId: string, clientId: string) {
  return updateClient(coachId, clientId, { active: true });
}

/** Hard-delete a client and all of their owned records (coach-scoped). */
export async function deleteClient(coachId: string, clientId: string) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const owned = await User.findOne({
    _id: clientId,
    role: "client",
    "clientProfile.coach": coach,
  });
  if (!owned) return false;

  const cid = new Types.ObjectId(clientId);
  const conversations = await Conversation.find({ client: cid }).select("_id").lean();
  const convoIds = conversations.map((c) => c._id);

  await Promise.all([
    ClientProgram.deleteMany({ client: cid, coach }),
    NutritionPlan.deleteMany({ client: cid, coach }),
    WorkoutLog.deleteMany({ client: cid }),
    ProgressEntry.deleteMany({ client: cid }),
    CheckinResponse.deleteMany({ client: cid }),
    Message.deleteMany({ conversation: { $in: convoIds } }),
    Conversation.deleteMany({ client: cid }),
    User.deleteOne({ _id: cid }),
  ]);
  return true;
}

/**
 * Coach-initiated password reset: generates a new random password, hashes
 * and saves it, forces the client to set their own on next login, and logs
 * the action for audit purposes. Returns the plaintext password — shown to
 * the coach exactly once, never stored anywhere.
 */
export async function resetClientPassword(
  coachId: string,
  coachName: string,
  clientId: string,
) {
  await connectToDatabase();
  const client = await User.findOne({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
  if (!client) return null;

  const password = randomString(10);
  client.passwordHash = await hashPassword(password);
  client.mustChangePassword = true;
  await client.save();

  await PasswordResetLog.create({
    coach: new Types.ObjectId(coachId),
    coachName,
    client: client._id,
    clientName: client.name,
  });

  return { password };
}

/** Lightweight stats for the coach dashboard. */
export async function coachClientStats(coachId: string) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const [total, active] = await Promise.all([
    User.countDocuments({ role: "client", "clientProfile.coach": coach }),
    User.countDocuments({ role: "client", "clientProfile.coach": coach, "clientProfile.active": true, status: "active" }),
  ]);
  return { total, active };
}
