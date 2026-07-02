/**
 * One-off reset: wipes all existing subscription plans and revenue-facing
 * statistics, then recreates the six current pricing tiers (three monthly,
 * three quarterly). Branding stays an independent paid add-on — never
 * enabled on any plan here.
 *
 * Historical Subscription records are kept for audit but their `amount` is
 * zeroed so aggregated revenue/MRR reads as 0 going forward. Coaches whose
 * `currentPlan` pointed at a deleted plan are re-matched to the nearest new
 * plan by `maxClients` (falling back to 9999 if unset), so their client
 * limit keeps working.
 *
 * Usage:
 *   npx tsx scripts/reset-plans.ts            # dry run — report only
 *   npx tsx scripts/reset-plans.ts --apply    # actually write changes
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* rely on real env */
  }
}
loadEnv();

const APPLY = process.argv.includes("--apply");

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { Plan } = await import("@/models/Plan");
  const { Subscription } = await import("@/models/Subscription");
  const { User } = await import("@/models/User");
  const { NEW_PLANS } = await import("@/lib/seed");

  await connectToDatabase();
  console.log(APPLY ? "Running reset in APPLY mode (writes enabled)." : "Running in DRY-RUN mode (no writes — pass --apply to commit changes).");

  const existingPlans = await Plan.find().select("_id name.en maxClients").lean();
  console.log(`\nFound ${existingPlans.length} existing plan(s) to remove.`);

  const revenueSubs = await Subscription.countDocuments({ amount: { $gt: 0 } });
  console.log(`Found ${revenueSubs} subscription record(s) with amount > 0 to zero out (kept for audit).`);

  const coachesWithOldPlan = await User.find({ role: "coach", "coachProfile.currentPlan": { $ne: null } })
    .select("_id coachProfile.currentPlan coachProfile.maxClients")
    .lean();
  console.log(`Found ${coachesWithOldPlan.length} coach(es) with a currentPlan reference to remap.`);

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to perform the reset.");
    process.exit(0);
  }

  // 1. Zero out revenue on historical subscriptions (kept for audit trail).
  const zeroed = await Subscription.updateMany({ amount: { $gt: 0 } }, { $set: { amount: 0 } });
  console.log(`✓ Zeroed amount on ${zeroed.modifiedCount} subscription record(s).`);

  // 2. Delete all existing plans.
  const deleted = await Plan.deleteMany({});
  console.log(`✓ Deleted ${deleted.deletedCount} old plan(s).`);

  // 3. Recreate the six current plans.
  const created = await Plan.create(NEW_PLANS as unknown as Record<string, unknown>[]);
  console.log(`✓ Created ${created.length} new plan(s).`);
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
  console.log(`✓ Remapped ${remapped} coach(es) to the nearest new plan.`);

  console.log("\n=== Reset complete ===");
  console.log(`Plans: ${created.length} (was ${existingPlans.length})`);
  console.log(`Subscriptions zeroed: ${zeroed.modifiedCount}`);
  console.log(`Coaches remapped: ${remapped}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
