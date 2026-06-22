import type { IMeal, INutritionItem } from "@/models/NutritionTemplate";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Scale a food's per-base-unit macros to a target grams amount.
 * `food` macros are stored per `unitGrams` (default 100g).
 */
export function scaleFoodMacros(
  food: { calories: number; protein: number; carbs: number; fat: number; fiber: number; unitGrams?: number },
  grams: number,
): Macros {
  const base = food.unitGrams && food.unitGrams > 0 ? food.unitGrams : 100;
  const factor = grams / base;
  return {
    calories: r1(food.calories * factor),
    protein: r1(food.protein * factor),
    carbs: r1(food.carbs * factor),
    fat: r1(food.fat * factor),
    fiber: r1((food.fiber ?? 0) * factor),
  };
}

/** Sum macros across all items in all meals. */
export function computePlanTotals(meals: IMeal[]): Macros {
  const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const meal of meals) {
    for (const item of meal.items as INutritionItem[]) {
      totals.calories += item.calories ?? 0;
      totals.protein += item.protein ?? 0;
      totals.carbs += item.carbs ?? 0;
      totals.fat += item.fat ?? 0;
      totals.fiber += item.fiber ?? 0;
    }
  }
  return {
    calories: r1(totals.calories),
    protein: r1(totals.protein),
    carbs: r1(totals.carbs),
    fat: r1(totals.fat),
    fiber: r1(totals.fiber),
  };
}

/** Sum macros for a single meal. */
export function computeMealTotals(meal: IMeal): Macros {
  return computePlanTotals([meal]);
}
