import { Types } from "mongoose";
import { addMonths } from "date-fns";
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
    {
      $lookup: {
        from: "subscriptions",
        let: { cid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$coach", "$$cid"] }, status: "active" } },
          { $sort: { activatedAt: -1 } },
          { $limit: 1 },
        ],
        as: "latestSub",
      },
    },
    { $addFields: { latestSub: { $arrayElemAt: ["$latestSub", 0] } } },
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

/**
 * Activate a coach subscription. Offline payment, admin-driven.
 *
 * The subscription period always starts now and runs for exactly
 * plan.durationMonths calendar months — it is never extended from a
 * previous (possibly stale) end date. Selecting a plan replaces whatever
 * subscription state existed before; renewing means picking the plan again,
 * which restarts the clock from today.
 *
 * Writes to User.coachProfile via an atomic $set (dotted paths), not a
 * fetch → mutate → save() round trip. The previous implementation replaced
 * the whole coachProfile subdocument with a plain object built by spreading
 * a Mongoose document (`{ ...coach.coachProfile }`) — spreading a hydrated
 * subdocument does not reliably copy its schema-defined fields, so the
 * "new" coachProfile silently lost data and, depending on document state,
 * the reassignment could fail to register as a modified path at all,
 * leaving `.save()` a no-op for coachProfile. $set with explicit dotted
 * paths avoids that class of bug entirely and matches changePlan() below.
 */
export async function activateSubscription(
  adminId: string,
  coachId: string,
  input: { planId: string; amount?: number; paymentMethod?: PaymentMethod; paymentReference?: string; notes?: string },
) {
  await connectToDatabase();
  const before = await User.findOne({ _id: coachId, role: "coach" }).select("coachProfile status").lean();
  if (!before) throw new PermissionError("Coach not found", "NOT_FOUND");
  const plan = await Plan.findById(input.planId);
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");
  console.log("PLAN", plan.toObject());

  // Guard against legacy/un-migrated Plan documents that predate the
  // durationMonths field (they still had the old `durationDays` field, or
  // none at all). Without this check, addMonths(startDate, undefined)
  // silently produces an Invalid Date, which then fails Mongoose's Date
  // cast inside Subscription.create() below — throwing BEFORE any write
  // happens, so the coach's plan/limits/dates are left completely
  // untouched. That thrown error was previously invisible because the
  // admin UI didn't check the action's result (see coaches-view.tsx fix).
  if (typeof plan.durationMonths !== "number" || !Number.isFinite(plan.durationMonths) || plan.durationMonths < 1) {
    throw new PermissionError(
      `Plan "${plan.name.ar || plan.name.en}" has no valid durationMonths (got: ${String(plan.durationMonths)}). Re-save this plan from the Plans page or run the plans reset tool before activating it.`,
      "INVALID_PLAN_DURATION",
    );
  }

  const now = new Date();
  const startDate = now;
  const endDate = addMonths(startDate, plan.durationMonths);
  console.log("START", startDate);
  console.log("END", endDate);

  // Any previously "active" subscription for this coach is now superseded.
  await Subscription.updateMany(
    { coach: new Types.ObjectId(coachId), status: "active" },
    { $set: { status: "expired" } },
  );

  await Subscription.create({
    coach: new Types.ObjectId(coachId),
    plan: plan._id,
    status: "active",
    startDate,
    endDate,
    amount: input.amount ?? plan.price,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    notes: input.notes,
    activatedBy: new Types.ObjectId(adminId),
    activatedAt: now,
  });

  const updatePayload = {
    status: "active" as const,
    "coachProfile.currentPlan": plan._id,
    "coachProfile.subscriptionStatus": "active" as const,
    "coachProfile.subscriptionStartDate": startDate,
    "coachProfile.subscriptionEndDate": endDate,
    "coachProfile.subscriptionPlanName": { ar: plan.name.ar, en: plan.name.en },
    "coachProfile.subscriptionTier": plan.tier,
    "coachProfile.planFeatures": plan.planFeatures,
    "coachProfile.maxClients": plan.maxClients,
  };
  console.log("UPDATE", updatePayload);

  const res = await User.updateOne(
    { _id: coachId, role: "coach" },
    { $set: updatePayload },
  );
  console.log("MATCHED", res.matchedCount);
  console.log("MODIFIED", res.modifiedCount);
  if (res.matchedCount === 0) throw new PermissionError("Coach not found", "NOT_FOUND");

  const updatedCoach = await User.findById(coachId).lean();
  console.log("AFTER coachProfile", updatedCoach?.coachProfile);
  const after = updatedCoach;

  await createNotification({
    recipient: coachId,
    type: "subscription_activated",
    titleAr: `تم تفعيل اشتراكك (${plan.name.ar}) حتى ${endDate.toISOString().slice(0, 10)}`,
    titleEn: `Your subscription (${plan.name.en}) is active until ${endDate.toISOString().slice(0, 10)}`,
    link: "/coach/subscription",
  });

  return { before: before.coachProfile, after: after?.coachProfile };
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
