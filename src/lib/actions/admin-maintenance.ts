"use server";

import { revalidatePath } from "next/cache";
import { getAdminCtx } from "./guards";
import { runAction, ok, type ActionResult } from "./result";
import { connectToDatabase } from "@/lib/db";
import { Food } from "@/models/Food";
import { FoodPriorityOverride } from "@/models/FoodPriorityOverride";

/**
 * TEMPORARY maintenance action (super-admin only): set every food's generator
 * priority to ★ (1 star) and clear all per-coach overrides. Same effect as the
 * `reset-food-priorities` CLI script, but runs inside the Next server so it uses
 * the app's working Atlas connection. Remove this file + its button once used.
 */
export async function resetAllFoodPrioritiesAction(): Promise<
  ActionResult<{ foods: number; overrides: number }>
> {
  return runAction(async () => {
    await getAdminCtx(); // throws unless the caller is super_admin
    await connectToDatabase();
    const foodRes = await Food.updateMany({}, { $set: { priority: 1 } });
    const ovRes = await FoodPriorityOverride.deleteMany({});
    revalidatePath("/admin/foods");
    return ok({ foods: foodRes.modifiedCount, overrides: ovRes.deletedCount });
  });
}
