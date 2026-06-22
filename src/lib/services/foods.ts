import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Food } from "@/models/Food";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
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

export interface ListOpts {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
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

  const [items, total] = await Promise.all([
    Food.find(filter)
      .sort({ isSystemFood: -1, nameEn: 1 })
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
  return true;
}
