/**
 * One-time migration: set EVERY food's generator priority to ★ (1 star).
 *
 * Rationale: the baseline is now the lowest star everywhere (system foods +
 * every coach's custom foods). Coaches/super-admin then raise the stars for the
 * foods they actually want the generator to prefer. Any pre-existing per-coach
 * priority overrides are cleared too, so nothing sits above ★ after the reset.
 *
 * Idempotent — safe to re-run. Touches only the `priority` field / override
 * rows; no other data or permissions are changed.
 *
 * Run with:  npm run reset-food-priorities
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

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { Food } = await import("@/models/Food");
  const { FoodPriorityOverride } = await import("@/models/FoodPriorityOverride");
  const mongoose = (await import("mongoose")).default;

  await connectToDatabase();

  const totalFoods = await Food.countDocuments({});
  const alreadyOne = await Food.countDocuments({ priority: 1 });
  const foodRes = await Food.updateMany({}, { $set: { priority: 1 } });
  const overrideRes = await FoodPriorityOverride.deleteMany({});

  console.log(`Foods total:            ${totalFoods}`);
  console.log(`Foods already ★:        ${alreadyOne}`);
  console.log(`Foods set to ★ now:     ${foodRes.modifiedCount}`);
  console.log(`Overrides cleared:      ${overrideRes.deletedCount}`);

  await mongoose.connection.close();
  console.log("\n✅ All foods reset to ★ (1 star).");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Reset failed:", err);
  process.exit(1);
});
