import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { Subscription } from "@/models/Subscription";
import { ClientProgram } from "@/models/ClientProgram";
import { NutritionPlan } from "@/models/NutritionPlan";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { NutritionTemplate } from "@/models/NutritionTemplate";
import { Exercise } from "@/models/Exercise";
import { Food } from "@/models/Food";
import { CheckinForm, CheckinResponse } from "@/models/Checkin";
import { Conversation, Message } from "@/models/Message";
import { Notification } from "@/models/Notification";
import { WorkoutLog } from "@/models/WorkoutLog";
import { ProgressEntry } from "@/models/ProgressEntry";
import { serialize } from "@/lib/serialize";
import { PermissionError, computeEffectiveCoachStatus } from "@/lib/permissions";
import type { AccountStatus, PaymentMethod } from "@/lib/constants";
import { createNotification } from "./notifications";

export async function getAdminStats() {
  await connectToDatabase();
  const [totalCoaches, activeCoaches, trialCoaches, expiredCoaches, totalClients, revenueAgg] =
    await Promise.all([
      User.countDocuments({ role: "coach" }),
      User.countDocuments({ role: "coach", status: "active" }),
      User.countDocuments({ role: "coach", status: "trial" }),
      User.countDocuments({ role: "coach", status: "expired" }),
      User.countDocuments({ role: "client" }),
      Subscription.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
  return {
    totalCoaches,
    activeCoaches,
    trialCoaches,
    expiredCoaches,
    totalClients,
    revenue: revenueAgg[0]?.total ?? 0,
  };
}

export async function listCoaches(opts: { query?: string; status?: string } = {}) {
  await connectToDatabase();
  const match: Record<string, unknown> = { role: "coach" };
  if (opts.status && opts.status !== "all") match.status = opts.status;
  if (opts.query?.trim()) {
    const rx = new RegExp(opts.query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }
  const rows = await User.aggregate([
    { $match: match },
    { $lookup: { from: "users", localField: "_id", foreignField: "clientProfile.coach", as: "clients" } },
    { $addFields: { clientCount: { $size: "$clients" } } },
    { $project: { clients: 0, passwordHash: 0 } },
    { $sort: { createdAt: -1 } },
  ]);
  return serialize(rows);
}

export async function getCoachDetail(coachId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(coachId)) return null;
  const coach = await User.findOne({ _id: coachId, role: "coach" }).select("-passwordHash").lean();
  if (!coach) return null;
  const [clientCount, subscriptions] = await Promise.all([
    User.countDocuments({ role: "client", "clientProfile.coach": new Types.ObjectId(coachId) }),
    Subscription.find({ coach: coachId }).populate("plan", "name tier").sort({ createdAt: -1 }).lean(),
  ]);
  return serialize({ coach, clientCount, subscriptions });
}

export async function setCoachStatus(coachId: string, status: AccountStatus) {
  await connectToDatabase();
  const res = await User.updateOne(
    { _id: coachId, role: "coach" },
    { $set: { status, "coachProfile.subscriptionStatus": status } },
  );
  return res.matchedCount > 0;
}

/**
 * Admin-driven "suspend subscription": treats the coach exactly as if their
 * subscription had expired (read-only, clients frozen — same as
 * computeEffectiveCoachStatus's natural lapse) WITHOUT blocking login,
 * logging them out, or touching their data. Distinct from the "suspended"
 * AccountStatus, which blocks login entirely.
 */
export async function suspendCoachSubscription(coachId: string) {
  await connectToDatabase();
  const coach = await User.findOne({ _id: coachId, role: "coach" }).select("status coachProfile.suspendedByAdmin");
  if (!coach) return false;
  if (coach.coachProfile?.suspendedByAdmin) return true; // already suspended

  await User.updateOne(
    { _id: coachId, role: "coach" },
    {
      $set: {
        status: "expired",
        "coachProfile.subscriptionStatus": "expired",
        "coachProfile.suspendedByAdmin": true,
        "coachProfile.preSuspendStatus": coach.status,
      },
    },
  );
  return true;
}

/** Lifts an admin-driven suspension, restoring the coach's prior status (re-derived from their actual dates). */
export async function reactivateCoachSubscription(coachId: string) {
  await connectToDatabase();
  const coach = await User.findOne({ _id: coachId, role: "coach" }).select(
    "coachProfile.preSuspendStatus coachProfile.trialEndDate coachProfile.subscriptionEndDate",
  );
  if (!coach) return false;

  const restored = computeEffectiveCoachStatus(
    coach.coachProfile?.preSuspendStatus ?? "active",
    coach.coachProfile?.trialEndDate ?? null,
    coach.coachProfile?.subscriptionEndDate ?? null,
  );

  await User.updateOne(
    { _id: coachId, role: "coach" },
    {
      $set: { status: restored, "coachProfile.subscriptionStatus": restored, "coachProfile.suspendedByAdmin": false },
      $unset: { "coachProfile.preSuspendStatus": "" },
    },
  );
  return true;
}

/** Activate (or renew) a coach subscription. Offline payment, admin-driven. */
export async function activateSubscription(
  adminId: string,
  coachId: string,
  input: { planId: string; months?: number; amount?: number; paymentMethod?: PaymentMethod; paymentReference?: string; notes?: string },
) {
  await connectToDatabase();
  const coach = await User.findOne({ _id: coachId, role: "coach" });
  if (!coach) throw new PermissionError("Coach not found", "NOT_FOUND");
  const plan = await Plan.findById(input.planId);
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");

  const months = input.months ?? 1;
  const now = new Date();
  // Extend from the later of now or the current end date.
  const currentEnd = coach.coachProfile?.subscriptionEndDate ?? null;
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const endDate = new Date(base.getTime() + months * plan.durationDays * 86_400_000);

  await Subscription.create({
    coach: coach._id,
    plan: plan._id,
    status: "active",
    startDate: now,
    endDate,
    amount: input.amount ?? plan.price * months,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    notes: input.notes,
    activatedBy: new Types.ObjectId(adminId),
    activatedAt: now,
  });

  coach.status = "active";
  coach.coachProfile = {
    ...(coach.coachProfile ?? { maxClients: 0 }),
    currentPlan: plan._id,
    subscriptionStatus: "active",
    subscriptionEndDate: endDate,
    maxClients: plan.maxClients,
  };
  await coach.save();

  await createNotification({
    recipient: coachId,
    type: "subscription_activated",
    titleAr: `تم تفعيل اشتراكك (${plan.name.ar}) حتى ${endDate.toISOString().slice(0, 10)}`,
    titleEn: `Your subscription (${plan.name.en}) is active until ${endDate.toISOString().slice(0, 10)}`,
    link: "/coach/subscription",
  });
  return true;
}

export async function changePlan(coachId: string, planId: string) {
  await connectToDatabase();
  const plan = await Plan.findById(planId);
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");
  await User.updateOne(
    { _id: coachId, role: "coach" },
    { $set: { "coachProfile.currentPlan": plan._id, "coachProfile.maxClients": plan.maxClients } },
  );
  return true;
}

/** Hard-delete a coach and ALL of their data. */
export async function deleteCoach(coachId: string) {
  await connectToDatabase();
  const coach = await User.findOne({ _id: coachId, role: "coach" });
  if (!coach) return false;
  const cid = new Types.ObjectId(coachId);

  const convos = await Conversation.find({ coach: cid }).select("_id").lean();
  const convoIds = convos.map((c) => c._id);

  await Promise.all([
    User.deleteMany({ role: "client", "clientProfile.coach": cid }),
    ClientProgram.deleteMany({ coach: cid }),
    NutritionPlan.deleteMany({ coach: cid }),
    WorkoutTemplate.deleteMany({ createdByCoach: cid }),
    NutritionTemplate.deleteMany({ createdByCoach: cid }),
    Exercise.deleteMany({ createdByCoach: cid }),
    Food.deleteMany({ createdByCoach: cid }),
    CheckinForm.deleteMany({ coach: cid }),
    CheckinResponse.deleteMany({ coach: cid }),
    WorkoutLog.deleteMany({ coach: cid }),
    ProgressEntry.deleteMany({ coach: cid }),
    Message.deleteMany({ conversation: { $in: convoIds } }),
    Conversation.deleteMany({ coach: cid }),
    Subscription.deleteMany({ coach: cid }),
    Notification.deleteMany({ recipient: cid }),
    User.deleteOne({ _id: cid }),
  ]);
  return true;
}
