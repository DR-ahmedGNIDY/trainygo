import { foodFitsMeal, type FoodCategory, type MealType } from "@/lib/constants";
import {
  DEFAULT_RATIOS,
  DIET_EXCLUDE_KEYWORDS,
  MEAL_COMPOSITION,
  MEALS_PER_DAY_SEQUENCE,
  MEAL_WEIGHT,
  REQUIRED_CATEGORIES,
  SNACK_ROTATION,
  TOLERANCE,
} from "./config";
import { solveGrams, type SolverFood } from "./solver";
import {
  GeneratorError,
  type EngineFood,
  type GeneratedItem,
  type GeneratedMeal,
  type GeneratedPlan,
  type GeneratorInput,
  type MacroRatio,
  type MacroTotals,
} from "./types";

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Portions are always written in 5g steps — never 147g. */
export const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Per-gram macros for a food (macros are stored per `unitGrams`). */
export function perGram(food: EngineFood) {
  const base = food.unitGrams > 0 ? food.unitGrams : 100;
  return {
    calories: food.calories / base,
    protein: food.protein / base,
    carbs: food.carbs / base,
    fat: food.fat / base,
    fiber: food.fiber / base,
  };
}

/** Normalise an optional custom ratio; fall back to the goal default. */
function resolveRatio(input: GeneratorInput): MacroRatio {
  const def = DEFAULT_RATIOS[input.goal];
  const c = input.ratio;
  if (!c || c.protein == null || c.carbs == null || c.fat == null) return def;
  const sum = c.protein + c.carbs + c.fat;
  if (sum <= 0) return def;
  // Normalise to 100 so slightly-off inputs still produce sane targets.
  return {
    protein: (c.protein / sum) * 100,
    carbs: (c.carbs / sum) * 100,
    fat: (c.fat / sum) * 100,
  };
}

export function dietAllows(food: EngineFood, goal: GeneratorInput["goal"]): boolean {
  if (goal !== "vegetarian" && goal !== "vegan") return true;
  if (goal === "vegan" && food.category === "dairy") return false;
  const words = DIET_EXCLUDE_KEYWORDS[goal];
  const hay = `${food.nameEn} ${food.nameAr}`.toLowerCase();
  return !words.some((w) => hay.includes(w.toLowerCase()));
}

/** Build category → sorted candidate list (highest priority first, stable). */
function buildPools(
  pool: EngineFood[],
  goal: GeneratorInput["goal"],
): Map<FoodCategory, EngineFood[]> {
  const map = new Map<FoodCategory, EngineFood[]>();
  for (const f of pool) {
    if (!dietAllows(f, goal)) continue;
    const list = map.get(f.category) ?? [];
    list.push(f);
    map.set(f.category, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) => b.priority - a.priority || a.nameEn.localeCompare(b.nameEn),
    );
  }
  return map;
}

interface PickCtx {
  usedToday: Set<string>;
  lastByCat: Map<FoodCategory, string>;
  seed: number;
}

/**
 * Selection rules, in order: belongs in this meal → not used yet today → not
 * the same food as the previous meal in this category → highest priority →
 * rotate among equal-priority options by seed for variety. Returns null when
 * the category has no candidate.
 *
 * Meal times narrow first and stars rank inside what's left, so the two work
 * together rather than one overriding the other: a coach's ★★★★★ dinner steak
 * never lands in breakfast while any breakfast food exists, but among the
 * breakfast foods their stars still decide. Every narrowing falls back to the
 * wider set when it would empty it — the preference is soft, so a thin library
 * degrades to a worse-fitting plan instead of no plan.
 */
function pickFood(
  category: FoodCategory,
  pools: Map<FoodCategory, EngineFood[]>,
  ctx: PickCtx,
  slot: number,
  meal: MealType,
): EngineFood | null {
  const cands = pools.get(category);
  if (!cands || cands.length === 0) return null;

  // Meal times before freshness: putting the right food in the meal matters
  // more than variety within it.
  const fitting = cands.filter((c) => foodFitsMeal(c.meals, meal));
  const inMeal = fitting.length ? fitting : cands;

  // Prefer foods not yet used today; only reuse when nothing fresh is left.
  let avail = inMeal.filter((c) => !ctx.usedToday.has(c.id));
  if (avail.length === 0) avail = inMeal;

  // Rotation: avoid repeating the previous meal's food in this category.
  const last = ctx.lastByCat.get(category);
  const noRepeat = avail.filter((c) => c.id !== last);
  const workingSet = noRepeat.length ? noRepeat : avail;

  // Already sorted by priority; rotate within the top-priority band by seed.
  const topPriority = workingSet[0].priority;
  const top = workingSet.filter((c) => c.priority === topPriority);
  const idx = (ctx.seed + slot) % top.length;
  return top[idx];
}

function categoriesForMeal(type: MealType, snackIndex: number): FoodCategory[] {
  if (type !== "snack") return MEAL_COMPOSITION[type];
  // Each snack takes two rotating categories so repeated snacks differ.
  const a = SNACK_ROTATION[snackIndex % SNACK_ROTATION.length];
  const b = SNACK_ROTATION[(snackIndex + 1) % SNACK_ROTATION.length];
  return [a, b];
}

/** Gram bounds per category so fillers (fruit/veg) stay sensible. */
export function categoryGramBounds(
  category: FoodCategory,
): { min: number; max: number; start: number } {
  switch (category) {
    case "vegetables":
      return { min: 30, max: 300, start: 100 };
    case "fruits":
      return { min: 30, max: 250, start: 100 };
    case "healthy_fats":
      return { min: 10, max: 90, start: 25 };
    case "dairy":
      return { min: 40, max: 350, start: 150 };
    default:
      // protein / carbs / supplements / drinks / snacks — the calorie carriers.
      return { min: 30, max: 500, start: 120 };
  }
}

function withinTolerance(
  totals: MacroTotals,
  target: { calories: number; protein: number; carbs: number; fat: number },
): boolean {
  const ok = (got: number, want: number) =>
    want <= 0 ? true : Math.abs(got - want) / want <= TOLERANCE;
  return (
    ok(totals.calories, target.calories) &&
    ok(totals.protein, target.protein) &&
    ok(totals.carbs, target.carbs) &&
    ok(totals.fat, target.fat)
  );
}

/**
 * Generate a full day plan from a food pool. Pure and deterministic: the same
 * `pool` + `input` (including `seed`) always yields the same plan.
 *
 * @throws {GeneratorError} when the library is empty or a required category is
 *   missing after the diet filter.
 */
export function generatePlan(
  pool: EngineFood[],
  input: GeneratorInput,
): GeneratedPlan {
  if (pool.length === 0) {
    throw new GeneratorError("Food library is empty.", "EMPTY_LIBRARY");
  }

  const pools = buildPools(pool, input.goal);
  for (const cat of REQUIRED_CATEGORIES) {
    if (!pools.get(cat)?.length) {
      throw new GeneratorError(
        `No foods in required category: ${cat}`,
        "MISSING_CATEGORY",
        cat,
      );
    }
  }

  const ratio = resolveRatio(input);
  const dayTarget = {
    calories: input.calories,
    protein: (input.calories * ratio.protein) / 100 / 4,
    carbs: (input.calories * ratio.carbs) / 100 / 4,
    fat: (input.calories * ratio.fat) / 100 / 9,
  };

  const sequence =
    MEALS_PER_DAY_SEQUENCE[input.mealsPerDay] ?? MEALS_PER_DAY_SEQUENCE[3];
  const weightSum = sequence.reduce((s, t) => s + MEAL_WEIGHT[t], 0);

  const ctx: PickCtx = {
    usedToday: new Set(),
    lastByCat: new Map(),
    seed: Math.abs(Math.trunc(input.seed ?? 0)),
  };

  // --- Phase 1: select foods per meal (composition + rotation rules) ---
  interface Chosen {
    food: EngineFood;
    mealIndex: number;
    startShare: number; // this food's slice of the day for a sensible start guess
  }
  const chosenAll: Chosen[] = [];
  let snackIndex = 0;

  sequence.forEach((type, mealIndex) => {
    const share = MEAL_WEIGHT[type] / weightSum;
    const cats = categoriesForMeal(type, type === "snack" ? snackIndex++ : 0);
    const picked: EngineFood[] = [];
    cats.forEach((cat, slot) => {
      const food = pickFood(cat, pools, ctx, mealIndex + slot, type);
      if (!food) return;
      picked.push(food);
      ctx.usedToday.add(food.id);
      ctx.lastByCat.set(cat, food.id);
    });
    for (const food of picked) {
      chosenAll.push({
        food,
        mealIndex,
        startShare: picked.length ? share / picked.length : 0,
      });
    }
  });

  // --- Phase 2: solve grams GLOBALLY against the day target ---
  // Solving the whole day at once (rather than each meal against an arbitrary
  // sub-target) lets the engine actually land within ±3% on the totals the
  // spec measures — some meal types (snacks) simply can't carry their calorie
  // share alone. Per-food gram bounds keep every item a realistic portion.
  const grams = (() => {
    if (chosenAll.length === 0) return [] as number[];
    const solverFoods: SolverFood[] = chosenAll.map((c) => {
      const pg = perGram(c.food);
      const b = categoryGramBounds(c.food.category);
      // Seed each food near its share of the day's calories so the descent
      // starts from a balanced portion rather than all-or-nothing.
      const startCal = dayTarget.calories * c.startShare;
      const startGram =
        pg.calories > 0
          ? Math.min(b.max, Math.max(b.min, startCal / pg.calories))
          : b.start;
      return {
        calories: pg.calories,
        protein: pg.protein,
        carbs: pg.carbs,
        fat: pg.fat,
        minGram: b.min,
        maxGram: b.max,
        startGram,
      };
    });
    return solveGrams(solverFoods, dayTarget);
  })();

  // --- Phase 3: build meals from solved grams ---
  const meals: GeneratedMeal[] = sequence.map((type) => ({ type, items: [] }));
  chosenAll.forEach((c, i) => {
    const q = round5(grams[i]);
    const pg = perGram(c.food);
    meals[c.mealIndex].items.push({
      food: c.food.id,
      nameAr: c.food.nameAr,
      nameEn: c.food.nameEn,
      quantity: q,
      unit: "100g",
      calories: r1(pg.calories * q),
      protein: r1(pg.protein * q),
      carbs: r1(pg.carbs * q),
      fat: r1(pg.fat * q),
      fiber: r1(pg.fiber * q),
    });
  });

  const totals = meals.reduce<MacroTotals>(
    (acc, m) => {
      for (const it of m.items) {
        acc.calories += it.calories;
        acc.protein += it.protein;
        acc.carbs += it.carbs;
        acc.fat += it.fat;
        acc.fiber += it.fiber;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const roundedTotals: MacroTotals = {
    calories: r1(totals.calories),
    protein: r1(totals.protein),
    carbs: r1(totals.carbs),
    fat: r1(totals.fat),
    fiber: r1(totals.fiber),
  };

  return {
    meals,
    totals: roundedTotals,
    target: {
      calories: r1(dayTarget.calories),
      protein: r1(dayTarget.protein),
      carbs: r1(dayTarget.carbs),
      fat: r1(dayTarget.fat),
    },
    ratio,
    withinTolerance: withinTolerance(roundedTotals, dayTarget),
  };
}
