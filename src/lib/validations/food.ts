import { z } from "zod";
import {
  FOOD_CATEGORIES,
  FOOD_UNITS,
  DEFAULT_FOOD_PRIORITY,
} from "@/lib/constants";

const num = (min = 0) =>
  z.union([z.number(), z.string()]).transform((v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? Math.max(min, n) : 0;
  });

export const foodSchema = z.object({
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب").max(120),
  nameEn: z.string().min(2, "English name required").max(120),
  category: z.enum(FOOD_CATEGORIES),
  unit: z.enum(FOOD_UNITS).default("100g"),
  unitGrams: num(0).optional(),
  calories: num(0),
  protein: num(0),
  carbs: num(0),
  fat: num(0),
  fiber: num(0),
  priority: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === "string" ? Number(v) : v;
      return [1, 2, 3, 4, 5].includes(n) ? n : DEFAULT_FOOD_PRIORITY;
    })
    .default(DEFAULT_FOOD_PRIORITY),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imagePublicId: z.string().optional().or(z.literal("")),
});

export type FoodInput = z.input<typeof foodSchema>;
export type FoodData = z.output<typeof foodSchema>;
