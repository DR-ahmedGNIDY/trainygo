import type { FoodCategory, GeneratorGoal, MealType } from "@/lib/constants";


/**
 * A food as the generator engine consumes it. Macros are stored per the food's
 * base unit (`unitGrams`, default 100g) — exactly as the Food model stores them.
 * The engine is framework-agnostic: it never touches Mongoose or the DB, so it
 * can be unit-tested and reused by future generators (workout, supplements…).
 */
export interface EngineFood {
  id: string;
  nameAr: string;
  nameEn: string;
  category: FoodCategory;
  priority: number; // 1–5, 5 = highest
  /**
   * Meals this food belongs in — a separate axis from `priority`. Empty means
   * "fits every meal"; see foodFitsMeal in constants.
   */
  meals: MealType[];
  unit: string;
  unitGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Macro split as percentages of total calories; the three should sum to 100. */
export interface MacroRatio {
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratorInput {
  calories: number;
  goal: GeneratorGoal;
  mealsPerDay: number;
  /** Optional custom macro ratio; when absent the goal's default is used. */
  ratio?: Partial<MacroRatio>;
  /** Rotation seed — changing it yields a different valid combination. */
  seed?: number;
}

export interface GeneratedItem {
  food: string;
  nameAr: string;
  nameEn: string;
  quantity: number; // grams
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface GeneratedMeal {
  type: MealType;
  items: GeneratedItem[];
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface GeneratedPlan {
  meals: GeneratedMeal[];
  totals: MacroTotals;
  target: { calories: number; protein: number; carbs: number; fat: number };
  ratio: MacroRatio;
  /** True when calories + all macros land within ±3% of target. */
  withinTolerance: boolean;
}

/** Machine-readable reasons the engine can refuse to generate. */
export type GeneratorErrorCode =
  | "EMPTY_LIBRARY"
  | "MISSING_CATEGORY"
  | "IMPOSSIBLE";

export class GeneratorError extends Error {
  code: GeneratorErrorCode;
  /** Category key when code === "MISSING_CATEGORY". */
  category?: FoodCategory;
  constructor(message: string, code: GeneratorErrorCode, category?: FoodCategory) {
    super(message);
    this.name = "GeneratorError";
    this.code = code;
    this.category = category;
  }
}
