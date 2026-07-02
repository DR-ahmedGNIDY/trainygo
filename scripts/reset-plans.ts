/**
 * One-off CLI reset: wipes all existing subscription plans and revenue-facing
 * statistics, then recreates the six current pricing tiers. Thin wrapper
 * around the reusable resetPlans() service (src/lib/services/reset-plans.ts),
 * which also powers the Super Admin "Reset Plans" dashboard page.
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
  const { getResetPlansStats, resetPlans } = await import("@/lib/services/reset-plans");

  await connectToDatabase();
  console.log(APPLY ? "Running reset in APPLY mode (writes enabled)." : "Running in DRY-RUN mode (no writes — pass --apply to commit changes).");

  const before = await getResetPlansStats();
  console.log(`\nFound ${before.plansCount} existing plan(s) to remove.`);
  console.log(`Total revenue on record: ${before.totalRevenue} EGP (will be zeroed).`);
  console.log(`Coaches linked to a plan: ${before.coachesLinked} (will be remapped).`);

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to perform the reset.");
    process.exit(0);
  }

  const result = await resetPlans();
  console.log("\n=== Reset complete ===");
  console.log(`Plans deleted: ${result.plansDeleted}`);
  console.log(`Plans created: ${result.plansCreated}`);
  console.log(`Subscriptions zeroed: ${result.subscriptionsZeroed}`);
  console.log(`Coaches remapped: ${result.coachesRemapped}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
