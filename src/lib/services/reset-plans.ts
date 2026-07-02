import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { Subscription } from "@/models/Subscription";
import { User } from "@/models/User";
import { NEW_PLANS } from "@/lib/seed";

export interface ResetPlansStats {
  plansCount: number;
  totalRevenue: number;
  coachesLinked: number;
}

/** Current-state stats shown on the Super Admin "Reset Plans" page before the action runs. */
export async function getResetPlansStats(): Promise<ResetPlansStats> {
  await connectToDatabase();
  const [plansCount, revenueAgg, coachesLinked] = await Promise.all([
    Plan.countDocuments(),
    Subscription.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    User.countDocuments({ role: "coach", "coachProfile.currentPlan": { $ne: null } }),
  ]);
  return {
    plansCount,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    coachesLinked,
  };
}

export interface ResetPlansResult {
  plansDeleted: number;
  plansCreated: number;
  subscriptionsZeroed: number;
  coachesRemapped: number;
}

/**
 * Wipes all existing subscription plans and revenue-facing statistics, then
 * recreates the six current pricing tiers (three monthly, three quarterly).
 * Branding/AI/API/analytics/PDF-branding stay disabled on every plan — sold
 * separately as add-ons.
 *
 * Historical Subscription records are kept for audit but their `amount` is
 * zeroed so aggregated revenue/MRR reads as 0 going forward. Coaches whose
 * `currentPlan` pointed at a deleted plan are re-matched to the nearest new
 * plan by `maxClients` (falling back to 9999 if unset), so their client
 * limit keeps working.
 */
export async function resetPlans(): Promise<ResetPlansResult> {
  await connectToDatabase();

  const coachesWithOldPlan = await User.find({ role: "coach", "coachProfile.currentPlan": { $ne: null } })
    .select("_id coachProfile.currentPlan coachProfile.maxClients")
    .lean();

  // 1. Zero out revenue on historical subscriptions (kept for audit trail).
  const zeroed = await Subscription.updateMany({ amount: { $gt: 0 } }, { $set: { amount: 0 } });

  // 2. Delete all existing plans.
  const deleted = await Plan.deleteMany({});

  // 3. Recreate the six current plans.
  const created = await Plan.create(NEW_PLANS as unknown as Record<string, unknown>[]);
  const sortedNewPlans = [...created].sort((a, b) => a.maxClients - b.maxClients);

  // 4. Remap coaches pointing at a deleted plan to the nearest new plan by maxClients.
  let remapped = 0;
  for (const coach of coachesWithOldPlan) {
    const oldMaxClients = coach.coachProfile?.maxClients || 9999;
    const nearest =
      sortedNewPlans.find((p) => p.maxClients >= oldMaxClients) ??
      sortedNewPlans[sortedNewPlans.length - 1];
    await User.updateOne(
      { _id: coach._id },
      {
        $set: {
          "coachProfile.currentPlan": nearest._id,
          "coachProfile.maxClients": coach.coachProfile?.maxClients || 9999,
        },
      },
    );
    remapped++;
  }

  return {
    plansDeleted: deleted.deletedCount ?? 0,
    plansCreated: created.length,
    subscriptionsZeroed: zeroed.modifiedCount ?? 0,
    coachesRemapped: remapped,
  };
}
