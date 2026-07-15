import { categoryGramBounds, perGram, round5 } from "@/lib/generator/engine";
import { TOLERANCE } from "@/lib/generator/config";
import type { EngineFood } from "@/lib/generator/types";
import { buildSwapOptions } from "./engine";
import type { Metrics, SwapDomain, SwapOption, SwapUnit } from "./types";

/** ±5% on calories and each macro (the generator itself aims for ±3%). */
export const SWAP_TOLERANCE = 0.05;

/** kcal per gram of each macro — how a macro miss is priced in energy. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

/** How many replacements the dialog offers before it stops being a choice. */
export const SWAP_OPTIONS_LIMIT = 8;

/** An EngineFood seen through the generic engine's `SwapUnit` lens. */
export interface FoodSwapUnit extends SwapUnit {
  food: EngineFood;
}

export const foodSwapDomain: SwapDomain<FoodSwapUnit> = {
  metricKeys: ["calories", "protein", "carbs", "fat"],
  // Weights convert each metric's error into kcal, the one unit all four share:
  // protein and carbs carry 4 kcal/g and fat 9 kcal/g, squared because the
  // solved error is squared. Calories are already kcal, so they weigh 1 and act
  // as the anchor that keeps a swapped item's energy where the coach left it.
  weights: {
    calories: 1,
    protein: KCAL_PER_GRAM.protein ** 2,
    carbs: KCAL_PER_GRAM.carbs ** 2,
    fat: KCAL_PER_GRAM.fat ** 2,
  },
  // A macro miss worth less than the generator's own ±3% of the item's energy
  // is noise: 1.6g of carbs on a 230 kcal chicken breast is not a failed match,
  // even though the original had none. Judging that as an infinite miss (0 carbs
  // → any carbs) would rank a near-identical breast below an unrelated fish.
  negligible: (target: Metrics) => {
    const energy = Math.max(target.calories ?? 0, 0) * TOLERANCE;
    return {
      calories: energy,
      protein: energy / KCAL_PER_GRAM.protein,
      carbs: energy / KCAL_PER_GRAM.carbs,
      fat: energy / KCAL_PER_GRAM.fat,
    };
  },
  rate: (u) => perGram(u.food),
  scaleBounds: (u) => categoryGramBounds(u.food.category),
  roundScale: round5,
  tolerance: SWAP_TOLERANCE,
};

export function toFoodSwapUnit(food: EngineFood): FoodSwapUnit {
  return { id: food.id, groupKey: food.category, priority: food.priority, food };
}

/** Replacement as the UI consumes it: a food, its grams, and its macros. */
export interface FoodSwapOption {
  id: string;
  nameAr: string;
  nameEn: string;
  priority: number;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  withinTolerance: boolean;
  samePriority: boolean;
  usedElsewhere: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function present(option: SwapOption<FoodSwapUnit>): FoodSwapOption {
  const { food } = option.unit;
  return {
    id: food.id,
    nameAr: food.nameAr,
    nameEn: food.nameEn,
    priority: food.priority,
    quantity: option.scale,
    calories: r1(option.metrics.calories),
    protein: r1(option.metrics.protein),
    carbs: r1(option.metrics.carbs),
    fat: r1(option.metrics.fat),
    // Fiber isn't matched on, but the swapped item still has to carry it.
    fiber: r1(perGram(food).fiber * option.scale),
    withinTolerance: option.withinTolerance,
    samePriority: option.samePriority,
    usedElsewhere: option.usedElsewhere,
  };
}

/**
 * Valid replacements for one generated food item, best first.
 *
 * `pool` is the coach's visible library (already diet-filtered); `usedElsewhere`
 * carries the food ids used by other items in the same template so repeats sink
 * to the bottom. Pure — call it from a `useMemo` and swap without a round trip.
 */
export function buildFoodSwapOptions(args: {
  current: EngineFood;
  quantity: number;
  pool: EngineFood[];
  usedElsewhere?: Iterable<string>;
  limit?: number;
}): FoodSwapOption[] {
  return buildSwapOptions(foodSwapDomain, {
    current: { unit: toFoodSwapUnit(args.current), scale: args.quantity },
    pool: args.pool.map(toFoodSwapUnit),
    usedElsewhere: args.usedElsewhere,
    limit: args.limit ?? SWAP_OPTIONS_LIMIT,
  }).map(present);
}
