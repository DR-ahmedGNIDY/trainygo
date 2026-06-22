import { connectToDatabase } from "@/lib/db";
import { Exercise } from "@/models/Exercise";
import { validateBatch } from "./validation";
import type { ImportResult, ImportSource, NormalizedExercise } from "./types";

/**
 * Exercise Import Service.
 *
 * Validates a batch of normalized exercises and persists them as SYSTEM
 * exercises (isSystemExercise = true, createdByCoach = null). Idempotent:
 * re-importing the same (source, externalId) updates rather than duplicates.
 *
 * NOTE: This is the import ARCHITECTURE. Real datasets (ExerciseDB / WGER) are
 * imported in Phase 6 — pass their records through the adapters first.
 */
export async function importExercises(
  items: NormalizedExercise[],
  opts: { dryRun?: boolean; source?: ImportSource } = {},
): Promise<ImportResult> {
  const dryRun = opts.dryRun ?? false;
  const { valid, errors } = validateBatch(items);

  const result: ImportResult = {
    source: opts.source ?? (items[0]?.source ?? "manual"),
    total: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    invalid: errors.length,
    errors,
    dryRun,
  };

  if (dryRun) {
    // Report-only: count what would be created vs updated.
    await connectToDatabase();
    for (const item of valid) {
      const filter = item.externalId
        ? { importSource: item.source, externalId: item.externalId }
        : { nameEn: item.nameEn, isSystemExercise: true };
      const exists = await Exercise.exists(filter);
      if (exists) result.updated++;
      else result.created++;
    }
    return result;
  }

  await connectToDatabase();
  for (const item of valid) {
    const filter = item.externalId
      ? { importSource: item.source, externalId: item.externalId }
      : { nameEn: item.nameEn, isSystemExercise: true };

    const res = await Exercise.updateOne(
      filter,
      {
        $set: {
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          category: item.category,
          targetMuscles: item.targetMuscles,
          description: item.description,
          instructions: item.instructions,
          gifUrl: item.gifUrl || undefined,
          youtubeUrl: item.youtubeUrl || undefined,
          imageUrlStart: item.imageUrlStart || undefined,
          imageUrlEnd: item.imageUrlEnd || undefined,
          isSystemExercise: true,
          createdByCoach: null,
          importSource: item.source,
          externalId: item.externalId,
        },
      },
      { upsert: true },
    );
    if (res.upsertedCount) result.created++;
    else if (res.modifiedCount) result.updated++;
    else result.skipped++;
  }

  return result;
}

/** Convenience: import from a JSON string (validated downstream). */
export async function importExercisesFromJson(
  json: string,
  opts: { dryRun?: boolean; source?: ImportSource } = {},
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON payload");
  }
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of exercises");
  return importExercises(parsed as NormalizedExercise[], opts);
}
