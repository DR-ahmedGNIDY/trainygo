import { z } from "zod";
import { EXERCISE_CATEGORIES } from "@/lib/constants";

const localized = z
  .object({ ar: z.string().optional(), en: z.string().optional() })
  .optional();

const musclesToArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string")
      return v.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    return [];
  });

export const exerciseSchema = z.object({
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب").max(120),
  nameEn: z.string().min(2, "English name required").max(120),
  category: z.enum(EXERCISE_CATEGORIES),
  targetMuscles: musclesToArray,
  description: localized,
  instructions: localized,
  commonMistakes: localized,
  coachTips: localized,
  gifUrl: z.string().url().optional().or(z.literal("")),
  gifPublicId: z.string().optional().or(z.literal("")),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  imageUrlStart: z.string().url().optional().or(z.literal("")),
  imageUrlEnd: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  videoPublicId: z.string().optional().or(z.literal("")),
});

export type ExerciseInput = z.input<typeof exerciseSchema>;
export type ExerciseData = z.output<typeof exerciseSchema>;
