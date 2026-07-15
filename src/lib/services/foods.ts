import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Food } from "@/models/Food";
import { FoodPriorityOverride } from "@/models/FoodPriorityOverride";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { FOOD_PRIORITIES, DEFAULT_FOOD_PRIORITY } from "@/lib/constants";
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
/*  Per-coach food priority (for the nutrition generator)                     */
/* -------------------------------------------------------------------------- */

function isValidPriority(p: number): p is (typeof FOOD_PRIORITIES)[number] {
  return (FOOD_PRIORITIES as readonly number[]).includes(p);
}

/**
 * Map of food id → this coach's personal priority override. System foods a
 * coach re-prioritised live here; the coach's own custom foods don't (their
 * priority is stored on the Food document itself).
 */
export async function getPriorityOverrides(
  coachId: string,
  foodIds?: string[],
): Promise<Map<string, number>> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (foodIds?.length) {
    filter.food = { $in: foodIds.map((id) => new Types.ObjectId(id)) };
  }
  const rows = await FoodPriorityOverride.find(filter)
    .select("food priority")
    .lean();
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r.food), r.priority);
  return map;
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
  const food = await Food.findOne({ _id: foodId, ...visibilityFilter(scope) })
    .select("isSystemFood createdByCoach")
    .lean();
  if (!food) return false;

  if (scope.role === "super_admin") {
    if (!food.isSystemFood)
      throw new PermissionError("Cannot edit coach food", "FORBIDDEN");
    await Food.updateOne({ _id: foodId }, { $set: { priority } });
    return true;
  }

  // Coach (or team member acting as coach).
  const isOwn = !food.isSystemFood && String(food.createdByCoach) === scope.coachId;
  if (isOwn) {
    await Food.updateOne({ _id: foodId }, { $set: { priority } });
    return true;
  }
  if (food.isSystemFood) {
    await FoodPriorityOverride.updateOne(
      { coach: new Types.ObjectId(scope.coachId), food: new Types.ObjectId(foodId) },
      { $set: { priority } },
      { upsert: true },
    );
    return true;
  }
  throw new PermissionError("Forbidden", "FORBIDDEN");
}

/**
 * Reset a food's priority back to its default for the current scope.
 * - coach on a system food: removes their override (back to global default).
 * - coach on their own food / super_admin on a system food: sets the base
 *   priority back to DEFAULT_FOOD_PRIORITY.
 */
export async function resetFoodPriority(
  scope: FoodScope,
  foodId: string,
): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(foodId)) return false;
  const food = await Food.findOne({ _id: foodId, ...visibilityFilter(scope) })
    .select("isSystemFood createdByCoach")
    .lean();
  if (!food) return false;

  if (scope.role === "super_admin") {
    if (!food.isSystemFood)
      throw new PermissionError("Cannot edit coach food", "FORBIDDEN");
    await Food.updateOne({ _id: foodId }, { $set: { priority: DEFAULT_FOOD_PRIORITY } });
    return true;
  }

  const isOwn = !food.isSystemFood && String(food.createdByCoach) === scope.coachId;
  if (isOwn) {
    await Food.updateOne({ _id: foodId }, { $set: { priority: DEFAULT_FOOD_PRIORITY } });
    return true;
  }
  // System food → drop the coach's override.
  await FoodPriorityOverride.deleteOne({
    coach: new Types.ObjectId(scope.coachId),
    food: new Types.ObjectId(foodId),
  });
  return true;
}
