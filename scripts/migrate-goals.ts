/**
 * One-off migration: repairs legacy `goal` values (e.g. "general_fitness")
 * left over from before CLIENT_GOALS was last revised, across every
 * collection that stores a goal. Uses the same normalizeGoal() the app uses
 * at write-time (src/lib/utils/goals.ts), so migrated values match exactly
 * what new writes would produce.
 *
 * Covers: WorkoutTemplate.goal, ClientProgram.goal, User.clientProfile.goal
 * (the "Program"/"Template" aliases in the brief). NutritionPlan/
 * NutritionTemplate have no `goal` field — checked and confirmed below, not
 * silently skipped.
 *
 * Usage:
 *   npx tsx scripts/migrate-goals.ts            # dry run — report only, no writes
 *   npx tsx scripts/migrate-goals.ts --apply     # actually update the documents
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

/** Reads a (possibly dot-nested, e.g. "clientProfile.goal") path off a plain object. */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { WorkoutTemplate } = await import("@/models/WorkoutTemplate");
  const { ClientProgram } = await import("@/models/ClientProgram");
  const { NutritionPlan } = await import("@/models/NutritionPlan");
  const { NutritionTemplate } = await import("@/models/NutritionTemplate");
  const { User } = await import("@/models/User");
  const { CLIENT_GOALS } = await import("@/lib/constants");
  const { normalizeGoal } = await import("@/lib/utils/goals");

  async function migrateCollection(
    label: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    goalField: string,
  ) {
    const validMatch = { [goalField]: { $in: CLIENT_GOALS } };
    const setMatch = { [goalField]: { $exists: true, $ne: null } };
    const legacyMatch = { $and: [setMatch, { [goalField]: { $nin: CLIENT_GOALS } }] };

    const [totalWithGoal, validCount, legacyDocs] = await Promise.all([
      model.countDocuments(setMatch),
      model.countDocuments(validMatch),
      model.find(legacyMatch).select(`_id ${goalField}`).lean(),
    ]);

    console.log(`\n${label}: ${totalWithGoal} document(s) with a goal set, ${validCount} already valid, ${legacyDocs.length} legacy.`);

    let updated = 0;
    for (const doc of legacyDocs) {
      const oldValue = getPath(doc, goalField) as string;
      const newValue = normalizeGoal(oldValue);
      console.log(`  - ${doc._id}: "${oldValue}" → "${newValue}"`);
      if (APPLY) {
        await model.updateOne({ _id: doc._id }, { $set: { [goalField]: newValue } });
        updated++;
      }
    }
    return { totalWithGoal, validCount, legacyCount: legacyDocs.length, updated };
  }

  await connectToDatabase();
  console.log(APPLY ? "Running migration in APPLY mode (writes enabled)." : "Running in DRY-RUN mode (no writes — pass --apply to commit changes).");

  const results: Record<string, Awaited<ReturnType<typeof migrateCollection>>> = {};

  results.WorkoutTemplate = await migrateCollection("WorkoutTemplate (goal)", WorkoutTemplate, "goal");
  results.ClientProgram = await migrateCollection("ClientProgram (goal)", ClientProgram, "goal");
  results["User.clientProfile"] = await migrateCollection("User.clientProfile (goal)", User, "clientProfile.goal");

  // NutritionPlan / NutritionTemplate have no `goal` field in the current
  // schema — confirmed explicitly rather than silently skipped.
  const nutritionPlanGoalCount = await NutritionPlan.countDocuments({ goal: { $exists: true } });
  const nutritionTemplateGoalCount = await NutritionTemplate.countDocuments({ goal: { $exists: true } });
  console.log(`\nNutritionPlan: ${nutritionPlanGoalCount} document(s) with a 'goal' field (expected 0 — no such field in the schema).`);
  console.log(`NutritionTemplate: ${nutritionTemplateGoalCount} document(s) with a 'goal' field (expected 0 — no such field in the schema).`);

  // ---- Report exactly what was asked for ----
  const generalFitnessTemplates = await WorkoutTemplate.countDocuments({ goal: "general_fitness" });
  const fatLossPrograms = await ClientProgram.countDocuments({ goal: "fat_loss" });
  const totalUpdated = Object.values(results).reduce((sum, r) => sum + (APPLY ? r.updated : r.legacyCount), 0);

  console.log("\n=== Migration report ===");
  console.log(`WorkoutTemplate docs still containing "general_fitness": ${generalFitnessTemplates}${APPLY ? "" : " (before this run; will be 0 after --apply)"}`);
  console.log(`ClientProgram docs containing "fat_loss" (already a valid goal, not migrated): ${fatLossPrograms}`);
  console.log(`${APPLY ? "Total records updated" : "Total records that WOULD be updated (dry run)"}: ${totalUpdated}`);
  console.log(JSON.stringify(results, null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
