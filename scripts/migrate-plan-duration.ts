/**
 * One-off migration: repairs Plan documents with a missing or invalid
 * `durationMonths` (e.g. legacy documents created before that field existed,
 * which still carry the old `durationDays` field, or none at all).
 *
 * Root cause this fixes: activateSubscription() calls
 * addMonths(startDate, plan.durationMonths). When durationMonths is
 * undefined, addMonths() silently returns an Invalid Date, which then fails
 * Mongoose's Date cast inside Subscription.create() with
 * "Cast to date failed for value \"Invalid Date\"" — aborting the whole
 * activation before any write happens.
 *
 * Repair order per plan (first match wins):
 *   1. durationMonths already valid (> 0)         → left untouched
 *   2. legacy durationDays field present            → round(durationDays / 30)
 *   3. tier name starts with "quarterly"            → 3
 *   4. otherwise (monthly plan, or unrecognized tier) → 1
 *
 * Usage:
 *   npx tsx scripts/migrate-plan-duration.ts            # dry run — report only
 *   npx tsx scripts/migrate-plan-duration.ts --apply    # actually update the documents
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

function inferDurationMonths(plan: {
  tier?: string;
  durationDays?: number;
}): number {
  if (typeof plan.durationDays === "number" && plan.durationDays > 0) {
    return Math.max(1, Math.round(plan.durationDays / 30));
  }
  if (plan.tier?.startsWith("quarterly")) return 3;
  return 1;
}

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { Plan } = await import("@/models/Plan");

  await connectToDatabase();
  console.log(APPLY ? "Running migration in APPLY mode (writes enabled)." : "Running in DRY-RUN mode (no writes — pass --apply to commit changes).");

  // Read raw documents (not through the Plan model's typed schema) so a
  // missing/legacy durationMonths field doesn't get silently coerced by
  // Mongoose defaults before we can inspect it.
  const docs = await Plan.collection
    .find({})
    .project({ _id: 1, name: 1, price: 1, maxClients: 1, durationMonths: 1, durationDays: 1, tier: 1 })
    .toArray();

  console.log(`\nFound ${docs.length} plan document(s).`);

  let invalidCount = 0;
  let fixedCount = 0;

  for (const doc of docs) {
    const isValid = typeof doc.durationMonths === "number" && doc.durationMonths > 0;
    console.log(
      `\n_id: ${doc._id}\n  name: ${JSON.stringify(doc.name)}\n  price: ${doc.price}\n  maxClients: ${doc.maxClients}\n  durationMonths: ${doc.durationMonths}\n  durationDays: ${doc.durationDays}\n  tier: ${doc.tier}`,
    );

    if (isValid) {
      console.log("  → durationMonths is valid, no change needed.");
      continue;
    }

    invalidCount++;
    const repaired = inferDurationMonths(doc);
    console.log(`  → INVALID durationMonths. Repairing to: ${repaired}`);

    if (APPLY) {
      await Plan.collection.updateOne(
        { _id: doc._id },
        { $set: { durationMonths: repaired }, $unset: { durationDays: "" } },
      );
      fixedCount++;
    }
  }

  console.log("\n=== Migration report ===");
  console.log(`Total plans: ${docs.length}`);
  console.log(`Invalid durationMonths found: ${invalidCount}`);
  console.log(`${APPLY ? "Plans fixed" : "Plans that WOULD be fixed (dry run)"}: ${APPLY ? fixedCount : invalidCount}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
