import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { SubscriptionFreezeHistory } from "@/models/SubscriptionFreezeHistory";
import { serialize } from "@/lib/serialize";
import { createNotification } from "./notifications";

const DAY_MS = 86_400_000;

/** Error raised by freeze/resume operations; carries a stable machine code + Arabic message. */
export class FreezeError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "FreezeError";
    this.code = code;
  }
}

/** Whole days remaining until `end` from now, never negative. */
function daysUntil(end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
}

/**
 * Loads a client strictly scoped to the owning coach. Returns null if the
 * client doesn't exist or belongs to a different coach — the ownership gate
 * every freeze/resume operation depends on.
 */
async function getOwnedClient(coachId: string, clientId: string) {
  if (!Types.ObjectId.isValid(clientId)) return null;
  return User.findOne({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
}

export interface FreezeInput {
  reason?: string;
  notes?: string;
}

/**
 * Freeze a client's subscription. Preserves the exact days remaining so the
 * client resumes with them intact. Enforces ownership, blocks a double-freeze,
 * blocks freezing an already-expired subscription, and never records negative
 * remaining days. `actingUserId` is the coach or team member performing it.
 */
export async function freezeClient(
  coachId: string,
  actingUserId: string,
  clientId: string,
  input: FreezeInput,
): Promise<{ remainingDays: number }> {
  await connectToDatabase();
  const client = await getOwnedClient(coachId, clientId);
  if (!client) throw new FreezeError("العميل غير موجود.", "NOT_FOUND");

  const cp = client.clientProfile!;
  if (cp.subscriptionFreezeStatus === "frozen") {
    throw new FreezeError("اشتراك العميل مجمّد بالفعل.", "ALREADY_FROZEN");
  }

  const endDate = cp.subscriptionEndDate ?? null;
  if (!endDate) {
    throw new FreezeError("لا يوجد تاريخ انتهاء للاشتراك يمكن تجميده.", "NO_END_DATE");
  }
  if (endDate.getTime() <= Date.now()) {
    throw new FreezeError("انتهى اشتراك العميل بالفعل، لا يمكن تجميده.", "SUBSCRIPTION_EXPIRED");
  }

  const remainingDays = daysUntil(endDate);
  if (remainingDays <= 0) {
    throw new FreezeError("لا توجد أيام متبقية لتجميدها.", "NO_REMAINING_DAYS");
  }

  const now = new Date();
  cp.subscriptionFreezeStatus = "frozen";
  cp.freezeStartDate = now;
  cp.freezeEndDate = null;
  cp.remainingDays = remainingDays;
  cp.freezeReason = input.reason;
  cp.lastFreezeBy = new Types.ObjectId(actingUserId);
  await client.save();

  await SubscriptionFreezeHistory.create({
    client: client._id,
    coach: new Types.ObjectId(coachId),
    frozenBy: new Types.ObjectId(actingUserId),
    freezeDate: now,
    resumeDate: null,
    remainingDays,
    reason: input.reason,
    notes: input.notes,
  });

  await createNotification({
    recipient: clientId,
    type: "subscription_frozen",
    titleAr: "تم تجميد اشتراكك بواسطة المدرب.",
    titleEn: "Your subscription was frozen by your coach.",
    bodyAr: `الأيام المتبقية المحفوظة: ${remainingDays}`,
    bodyEn: `Preserved remaining days: ${remainingDays}`,
  });

  return { remainingDays };
}

/**
 * Resume a frozen client's subscription. New end date = today + preserved
 * remaining days, so no days are lost. Enforces ownership and blocks resuming
 * a subscription that isn't frozen. Adds the elapsed frozen span to
 * `totalFrozenDays` and closes the open freeze-history record.
 */
export async function resumeClient(
  coachId: string,
  actingUserId: string,
  clientId: string,
): Promise<{ endDate: Date; remainingDays: number }> {
  await connectToDatabase();
  const client = await getOwnedClient(coachId, clientId);
  if (!client) throw new FreezeError("العميل غير موجود.", "NOT_FOUND");

  const cp = client.clientProfile!;
  if (cp.subscriptionFreezeStatus !== "frozen") {
    throw new FreezeError("اشتراك العميل غير مجمّد.", "NOT_FROZEN");
  }

  const remainingDays = Math.max(0, cp.remainingDays ?? 0);
  const now = new Date();
  const newEnd = new Date(now.getTime() + remainingDays * DAY_MS);
  const frozenFor = cp.freezeStartDate
    ? Math.max(0, Math.round((now.getTime() - cp.freezeStartDate.getTime()) / DAY_MS))
    : 0;

  cp.subscriptionFreezeStatus = "active";
  cp.subscriptionStartDate = now;
  cp.subscriptionEndDate = newEnd;
  cp.freezeEndDate = now;
  cp.totalFrozenDays = (cp.totalFrozenDays ?? 0) + frozenFor;
  cp.remainingDays = null;
  cp.lastFreezeBy = new Types.ObjectId(actingUserId);
  await client.save();

  // Close the most recent still-open freeze record for this client.
  await SubscriptionFreezeHistory.findOneAndUpdate(
    { client: client._id, resumeDate: null },
    { $set: { resumeDate: now } },
    { sort: { freezeDate: -1 } },
  );

  await createNotification({
    recipient: clientId,
    type: "subscription_resumed",
    titleAr: "تم استئناف اشتراكك.",
    titleEn: "Your subscription was resumed.",
    bodyAr: `ينتهي اشتراكك في ${newEnd.toLocaleDateString("en-GB")}`,
    bodyEn: `Your subscription now ends on ${newEnd.toLocaleDateString("en-GB")}`,
  });

  return { endDate: newEnd, remainingDays };
}

/** Number of currently-frozen clients for a coach (dashboard widget). */
export async function countFrozenClients(coachId: string): Promise<number> {
  await connectToDatabase();
  return User.countDocuments({
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
    "clientProfile.subscriptionFreezeStatus": "frozen",
  });
}

/** The freeze timeline for one client (newest first), scoped to the coach. */
export async function listFreezeHistory(coachId: string, clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return [];
  const docs = await SubscriptionFreezeHistory.find({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
  })
    .sort({ freezeDate: -1 })
    .lean();
  return serialize(docs);
}

export interface FreezeAnalytics {
  frozenNow: number;
  totalFreezes: number;
  avgFreezeDurationDays: number | null;
  topReasons: { reason: string; count: number }[];
}

/** Aggregate freeze analytics for the coach dashboard/reports. */
export async function getFreezeAnalytics(coachId: string): Promise<FreezeAnalytics> {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const [frozenNow, records] = await Promise.all([
    countFrozenClients(coachId),
    SubscriptionFreezeHistory.find({ coach }).select("freezeDate resumeDate reason").lean(),
  ]);

  const completed = records.filter((r) => r.resumeDate);
  const avgFreezeDurationDays =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (sum, r) => sum + (new Date(r.resumeDate!).getTime() - new Date(r.freezeDate).getTime()) / DAY_MS,
            0,
          ) / completed.length,
        )
      : null;

  const reasonCounts = new Map<string, number>();
  for (const r of records) {
    const key = (r.reason ?? "").trim();
    if (!key) continue;
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const topReasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { frozenNow, totalFreezes: records.length, avgFreezeDurationDays, topReasons };
}
