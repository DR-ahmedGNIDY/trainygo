import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { ClientProgram } from "@/models/ClientProgram";
import { NutritionPlan } from "@/models/NutritionPlan";
import { serialize } from "@/lib/serialize";

/** The coach id that owns this client (used to scope client writes). */
export async function getOwnCoachId(clientId: string): Promise<string | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return null;
  const doc = await User.findOne({ _id: clientId, role: "client" })
    .select("clientProfile.coach")
    .lean();
  const coach = (doc?.clientProfile as { coach?: Types.ObjectId } | undefined)?.coach;
  return coach ? String(coach) : null;
}

export async function getOwnProfile(clientId: string) {
  await connectToDatabase();
  const doc = await User.findOne({ _id: clientId, role: "client" })
    .select("name username email phone clientProfile")
    .lean();
  return doc ? serialize(doc) : null;
}

export async function getOwnActiveProgram(clientId: string) {
  await connectToDatabase();
  const doc = await ClientProgram.findOne({
    client: new Types.ObjectId(clientId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}

export async function updateOwnProfile(
  clientId: string,
  input: { name?: string; phone?: string; height?: number; weight?: number },
) {
  await connectToDatabase();
  const set: Record<string, unknown> = {};
  if (input.name) set.name = input.name;
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.height !== undefined) set["clientProfile.height"] = input.height;
  if (input.weight !== undefined) set["clientProfile.currentWeight"] = input.weight;
  await User.updateOne({ _id: clientId, role: "client" }, { $set: set });
  return true;
}

export async function changeOwnPassword(
  clientId: string,
  current: string,
  next: string,
) {
  await connectToDatabase();
  const { comparePassword, hashPassword } = await import("@/lib/auth/password");
  const user = await User.findOne({ _id: clientId, role: "client" });
  if (!user) return { ok: false as const, error: "NOT_FOUND" };
  const valid = await comparePassword(current, user.passwordHash);
  if (!valid) return { ok: false as const, error: "WRONG_PASSWORD" };
  user.passwordHash = await hashPassword(next);
  user.mustChangePassword = false;
  await user.save();
  return { ok: true as const };
}

export async function getOwnActivePlan(clientId: string) {
  await connectToDatabase();
  const doc = await NutritionPlan.findOne({
    client: new Types.ObjectId(clientId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}
