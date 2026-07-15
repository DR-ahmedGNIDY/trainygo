import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Food } from "@/models/Food";
import {
  FoodPriorityOverride,
  type IFoodPriorityOverride,
} from "@/models/FoodPriorityOverride";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import {
  FOOD_PRIORITIES,
  MEAL_TYPES,
  DEFAULT_FOOD_MEALS,
  DEFAULT_FOOD_PRIORITY,
  type MealType,
} from "@/lib/constants";
import type { FoodData } from "@/lib/validations/food";

export type FoodScope =
  | { role: "super_admin" }
  | { role: "coach"; coachId: string };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function visibilityFilter(scope: FoodScope) {
  if (scope.role === "coach") {
    return {
      $or: [
        { isSystemFood: true },
        { createdByCoach: new Types.ObjectId(scope.coachId) },
      ],
    };
  }
  return { isSystemFood: true };
}

export type FoodSortBy = "calories" | "protein" | "carbs" | "fat" | "name";

export interface ListOpts {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: FoodSortBy;
  sortDir?: "asc" | "desc";
}

export async function listFoods(scope: FoodScope, opts: ListOpts = {}) {
  await connectToDatabase();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(80, Math.max(1, opts.limit ?? 30));

  const and: Record<string, unknown>[] = [visibilityFilter(scope)];
  if (opts.category && opts.category !== "all") and.push({ category: opts.category });
  if (opts.query?.trim()) {
    const rx = new RegExp(escapeRegex(opts.query.trim()), "i");
    and.push({ $or: [{ nameAr: rx }, { nameEn: rx }] });
  }
  const filter = { $and: and };

  const dir = opts.sortDir === "desc" ? -1 : 1;
  const sort: Record<string, 1 | -1> =
    opts.sortBy && opts.sortBy !== "name"
      ? { [opts.sortBy]: dir }
      : { isSystemFood: -1, nameEn: 1 };

  const [items, total] = await Promise.all([
    Food.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Food.countDocuments(filter),
  ]);

  return {
    items: serialize(items),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

export async function createFood(scope: FoodScope, data: FoodData) {
  await connectToDatabase();
  const isSystem = scope.role === "super_admin";
  const doc = await Food.create({
    ...data,
    imageUrl: data.imageUrl || undefined,
    imagePublicId: data.imagePublicId || undefined,
    isSystemFood: isSystem,
    createdByCoach: isSystem ? null : new Types.ObjectId((scope as { coachId: string }).coachId),
  });
  return doc._id.toString();
}

function assertCanMutate(
  food: { isSystemFood: boolean; createdByCoach?: Types.ObjectId | null },
  scope: FoodScope,
) {
  if (scope.role === "super_admin") {
    if (!food.isSystemFood)
      throw new PermissionError("Cannot edit coach food", "FORBIDDEN");
  } else {
    if (food.isSystemFood || String(food.createdByCoach) !== scope.coachId)
      throw new PermissionError("Cannot edit system food", "FORBIDDEN");
  }
}

export async function updateFood(id: string, scope: FoodScope, data: FoodData) {
  await connectToDatabase();
  const food = await Food.findById(id);
  if (!food) return false;
  assertCanMutate(food, scope);
  Object.assign(food, data);
  await food.save();
  return true;
}

export async function deleteFood(id: string, scope: FoodScope) {
  await connectToDatabase();
  const food = await Food.findById(id);
  if (!food) return false;
  assertCanMutate(food, scope);
  await food.deleteOne();
  // Clean up any per-coach priority overrides pointing at this food.
  await FoodPriorityOverride.deleteMany({ food: food._id });
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Per-coach food preferences: priority + meal times (for the generator)     */
/* -------------------------------------------------------------------------- */

function isValidPriority(p: number): p is (typeof FOOD_PRIORITIES)[number] {
  return (FOOD_PRIORITIES as readonly number[]).includes(p);
}

/** Keep only real meal types, de-duplicated and in canonical order. */
function normaliseMeals(meals: unknown): MealType[] {
  if (!Array.isArray(meals)) return [];
  return MEAL_TYPES.filter((m) => meals.includes(m));
}

/** This coach's personal overrides for a food. Absent field = not overridden. */
export interface FoodOverride {
  priority?: number;
  meals?: MealType[];
}

/**
 * Map of food id → this coach's personal overrides. System foods a coach
 * re-prioritised or re-slotted live here; the coach's own custom foods don't
 * (their values are stored on the Food document itself).
 */
export async function getFoodOverrides(
  coachId: string,
  foodIds?: string[],
): Promise<Map<string, FoodOverride>> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (foodIds?.length) {
    filter.food = { $in: foodIds.map((id) => new Types.ObjectId(id)) };
  }
  const rows = await FoodPriorityOverride.find(filter)
    .select("food priority meals")
    .lean();
  const map = new Map<string, FoodOverride>();
  for (const r of rows) {
    const o: FoodOverride = {};
    // The two axes are independent — only carry across what was actually set,
    // so a meals-only override can't drag a priority along with it.
    if (r.priority != null) o.priority = r.priority;
    if (r.meals != null) o.meals = r.meals;
    map.set(String(r.food), o);
  }
  return map;
}

/**
 * Where a write for `scope` lands: "base" edits the Food document itself,
 * "override" writes this coach's personal row for a system food. Returns null
 * when the food isn't visible to the scope.
 *
 * @throws {PermissionError} when the scope may see the food but not edit it.
 */
async function resolveWriteTarget(
  scope: FoodScope,
  foodId: string,
): Promise<"base" | "override" | null> {
  const food = await Food.findOne({ _id: foodId, ...visibilityFilter(scope) })
    .select("isSystemFood createdByCoach")
    .lean();
  if (!food) return null;

  if (scope.role === "super_admin") {
    if (!food.isSystemFood)
      throw new PermissionError("Cannot edit coach food", "FORBIDDEN");
    return "base";
  }
  // Coach (or team member acting as coach) on their OWN custom food.
  if (!food.isSystemFood && String(food.createdByCoach) === scope.coachId) return "base";
  if (food.isSystemFood) return "override";
  throw new PermissionError("Forbidden", "FORBIDDEN");
}

/** Upsert one field of a coach's override row without disturbing the other. */
async function setOverrideField(
  coachId: string,
  foodId: string,
  patch: Partial<Pick<IFoodPriorityOverride, "priority" | "meals">>,
) {
  await FoodPriorityOverride.updateOne(
    { coach: new Types.ObjectId(coachId), food: new Types.ObjectId(foodId) },
    { $set: patch },
    { upsert: true },
  );
}

/**
 * Clear one field of a coach's override row, dropping the row once neither
 * axis is overridden any more. Unsetting rather than deleting matters: the row
 * may still hold the coach's choice for the *other* axis.
 */
async function clearOverrideField(
  coachId: string,
  foodId: string,
  field: "priority" | "meals",
) {
  const key = { coach: new Types.ObjectId(coachId), food: new Types.ObjectId(foodId) };
  await FoodPriorityOverride.updateOne(key, { $unset: { [field]: 1 } });
  await FoodPriorityOverride.deleteOne({
    ...key,
    priority: { $exists: false },
    meals: { $exists: false },
  });
}

/**
 * Set a food's priority for the current scope.
 * - super_admin: edits the SYSTEM food's base priority (the global default).
 * - coach on their OWN custom food: edits the food's priority directly.
 * - coach on a SYSTEM food: upserts a personal override (never touches the food).
 */
export async function setFoodPriority(
  scope: FoodScope,
  foodId: string,
  priority: number,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(foodId) || !isValidPriority(priority)) return false;
  const target = await resolveWriteTarget(scope, foodId);
  if (!target) return false;

  if (target === "base") {
    await Food.updateOne({ _id: foodId }, { $set: { priority } });
  } else {
    await setOverrideField((scope as { coachId: string }).coachId, foodId, { priority });
  }
  return true;
}

/**
 * Reset a food's priority back to its default for the current scope.
 * - coach on a system food: removes their priority override (back to global
 *   default), leaving any meal-times override of theirs intact.
 * - coach on their own food / super_admin on a system food: sets the base
 *   priority back to DEFAULT_FOOD_PRIORITY.
 */
export async function resetFoodPriority(
  scope: FoodScope,
  foodId: string,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(foodId)) return false;
  const target = await resolveWriteTarget(scope, foodId);
  if (!target) return false;

  if (target === "base") {
    await Food.updateOne({ _id: foodId }, { $set: { priority: DEFAULT_FOOD_PRIORITY } });
  } else {
    await clearOverrideField((scope as { coachId: string }).coachId, foodId, "priority");
  }
  return true;
}

/**
 * Set which meals a food belongs in, for the current scope. Same routing as
 * setFoodPriority, and deliberately separate from it: a coach re-slotting a
 * food must never disturb its stars.
 *
 * An empty selection is stored as-is and read back as "fits every meal", so the
 * generator can never end up with a food that fits nothing.
 */
export async function setFoodMeals(
  scope: FoodScope,
  foodId: string,
  meals: unknown,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(foodId)) return false;
  const target = await resolveWriteTarget(scope, foodId);
  if (!target) return false;

  const clean = normaliseMeals(meals);
  if (target === "base") {
    await Food.updateOne({ _id: foodId }, { $set: { meals: clean } });
  } else {
    await setOverrideField((scope as { coachId: string }).coachId, foodId, { meals: clean });
  }
  return true;
}

/**
 * Reset a food's meals for the current scope — coach on a system food drops
 * their override; otherwise the base goes back to "every meal".
 */
export async function resetFoodMeals(
  scope: FoodScope,
  foodId: string,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(foodId)) return false;
  const target = await resolveWriteTarget(scope, foodId);
  if (!target) return false;

  if (target === "base") {
    await Food.updateOne({ _id: foodId }, { $set: { meals: [...DEFAULT_FOOD_MEALS] } });
  } else {
    await clearOverrideField((scope as { coachId: string }).coachId, foodId, "meals");
  }
  return true;
}
