import type { IMeal, INutritionItem } from "@/models/NutritionTemplate";

/**
 * Map stored meals → nutrition-builder meals. Stored items hold the scaled
 * macros for their quantity; the builder needs a per-base macro set to rescale
 * live, so we reconstruct base = (stored macros, unitGrams = stored quantity).
 */
export function mealsToBuilder(meals: IMeal[]) {
  return meals.map((m) => ({
    type: m.type,
    name: m.name,
    items: (m.items as INutritionItem[]).map((it) => ({
      food: (it.food as unknown as string) ?? null,
      nameAr: it.nameAr,
      nameEn: it.nameEn,
      quantity: it.quantity,
      unit: it.unit,
      base: {
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        fiber: it.fiber,
        unitGrams: it.quantity || 100,
      },
      substitutes: (it.substitutes ?? []).map((s) => ({
        food: (s.food as unknown as string) ?? null,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        quantity: s.quantity,
        unit: s.unit,
      })),
    })),
  }));
}
