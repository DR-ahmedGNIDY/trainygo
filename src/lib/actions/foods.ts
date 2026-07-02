"use server";

import { revalidatePath } from "next/cache";
import { resolveCoachAreaScope } from "./guards";
import { canAccessFoods } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import { foodSchema, type FoodInput } from "@/lib/validations/food";
import * as foods from "@/lib/services/foods";
import type { FoodScope } from "@/lib/services/foods";

async function resolveScope(): Promise<FoodScope> {
  return resolveCoachAreaScope(canAccessFoods);
}

function revalidate() {
  revalidatePath("/admin/foods");
  revalidatePath("/coach/nutrition/foods");
}

export async function createFoodAction(
  input: FoodInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = foodSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const scope = await resolveScope();
    const id = await foods.createFood(scope, parsed.data);
    revalidate();
    return ok({ id });
  });
}

export async function updateFoodAction(
  id: string,
  input: FoodInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = foodSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const scope = await resolveScope();
    const done = await foods.updateFood(id, scope, parsed.data);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidate();
    return ok();
  });
}

export interface FoodPickerItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  unit: string;
  unitGrams: number;
  imageUrl?: string;
}

export async function searchFoodsAction(
  query: string,
  category?: string,
): Promise<ActionResult<{ items: FoodPickerItem[] }>> {
  return runAction(async () => {
    const scope = await resolveScope();
    const res = await foods.listFoods(scope, { query, category, limit: 30 });
    const items = (
      res.items as unknown as {
        _id: string;
        nameAr: string;
        nameEn: string;
        category: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        unit: string;
        unitGrams?: number;
        imageUrl?: string;
      }[]
    ).map((f) => ({
      id: String(f._id),
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      category: f.category,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
      unit: f.unit,
      unitGrams: f.unitGrams ?? 100,
      imageUrl: f.imageUrl,
    }));
    return ok({ items });
  });
}

export async function deleteFoodAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await foods.deleteFood(id, scope);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidate();
    return ok();
  });
}
