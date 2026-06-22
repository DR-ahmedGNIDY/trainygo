import { z } from "zod";
import { EXERCISE_CATEGORIES } from "@/lib/constants";

/** Validation layer for normalized import exercises. */
export const normalizedExerciseSchema = z.object({
  externalId: z.string().optional(),
  source: z.enum(["exercisedb", "wger", "free-exercise-db", "manual"]),
  nameAr: z.string().min(1, "nameAr required").max(160),
  nameEn: z.string().min(1, "nameEn required").max(160),
  category: z.enum(EXERCISE_CATEGORIES),
  targetMuscles: z.array(z.string()).default([]),
  description: z.object({ ar: z.string().optional(), en: z.string().optional() }).optional(),
  instructions: z.object({ ar: z.string().optional(), en: z.string().optional() }).optional(),
  gifUrl: z.string().url().optional().or(z.literal("")),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  imageUrlStart: z.string().url().optional().or(z.literal("")),
  imageUrlEnd: z.string().url().optional().or(z.literal("")),
});

export type ValidatedExercise = z.infer<typeof normalizedExerciseSchema>;

/** Validate a batch; returns valid items + per-index errors. */
export function validateBatch(items: unknown[]): {
  valid: ValidatedExercise[];
  errors: { index: number; message: string }[];
} {
  const valid: ValidatedExercise[] = [];
  const errors: { index: number; message: string }[] = [];
  items.forEach((item, index) => {
    const parsed = normalizedExerciseSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ index, message: parsed.error.issues.map((i) => i.message).join("; ") });
  });
  return { valid, errors };
}
