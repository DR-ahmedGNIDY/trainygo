"use server";

import { revalidatePath } from "next/cache";
import { resolveCoachAreaScope } from "./guards";
import { canAccessTemplates } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import * as gen from "@/lib/services/nutrition-generator";
import * as nt from "@/lib/services/nutrition-templates";
import { GeneratorError } from "@/lib/generator/types";
import type { EngineFood, GeneratedPlan, MacroRatio } from "@/lib/generator/types";
import {
  GENERATOR_GOALS,
  GENERATOR_CALORIE_OPTIONS,
  GENERATOR_MEALS_OPTIONS,
  type GeneratorGoal,
} from "@/lib/constants";
import type { IMeal } from "@/models/NutritionTemplate";

async function resolveScope() {
  return resolveCoachAreaScope(canAccessTemplates);
}

export interface GenerateInput {
  calories: number;
  goal: GeneratorGoal;
  mealsPerDay: number;
  ratio?: Partial<MacroRatio>;
  seed?: number;
}

function friendlyError(e: GeneratorError): ReturnType<typeof fail> {
  switch (e.code) {
    case "EMPTY_LIBRARY":
      return fail(
        "مكتبة الأطعمة فارغة. أضف أطعمة أولاً قبل توليد قالب.",
        "EMPTY_LIBRARY",
      );
    case "MISSING_CATEGORY":
      return fail(
        `تصنيف مطلوب غير متوفر في مكتبتك (${e.category}). أضف أطعمة من هذا التصنيف.`,
        "MISSING_CATEGORY",
      );
    default:
      return fail("تعذّر حساب الماكروز المطلوبة. جرّب إعدادات مختلفة.", "IMPOSSIBLE");
  }
}

export async function generateNutritionAction(
  input: GenerateInput,
): Promise<
  ActionResult<{ plan: GeneratedPlan; historyId: string | null; swapPool: EngineFood[] }>
> {
  return runAction(async () => {
    // Validate inputs against the allowed presets.
    if (!GENERATOR_CALORIE_OPTIONS.includes(input.calories as never))
      return fail("سعرات غير صالحة", "VALIDATION");
    if (!GENERATOR_GOALS.includes(input.goal))
      return fail("هدف غير صالح", "VALIDATION");
    if (!GENERATOR_MEALS_OPTIONS.includes(input.mealsPerDay as never))
      return fail("عدد وجبات غير صالح", "VALIDATION");

    const scope = await resolveScope();
    try {
      const result = await gen.generateAndRecord(scope, {
        calories: input.calories,
        goal: input.goal,
        mealsPerDay: input.mealsPerDay,
        ratio: input.ratio,
        seed: input.seed,
      });
      revalidatePath("/coach/nutrition/generator");
      return ok(result);
    } catch (e) {
      if (e instanceof GeneratorError) return friendlyError(e);
      throw e;
    }
  });
}

/**
 * Fetch the swap candidate pool for a plan the client already holds — used when
 * a coach reopens a generation from history, where no pool came with the plan.
 * Generating returns its pool inline, so this is one query per reopen, not one
 * per swap; the client caches the result.
 */
export async function getSwapPoolAction(input: {
  goal: GeneratorGoal;
  foodIds: string[];
}): Promise<ActionResult<{ swapPool: EngineFood[] }>> {
  return runAction(async () => {
    if (!GENERATOR_GOALS.includes(input.goal))
      return fail("هدف غير صالح", "VALIDATION");
    const scope = await resolveScope();
    const swapPool = await gen.loadSwapPool(scope, input.goal, input.foodIds ?? []);
    return ok({ swapPool });
  });
}

/** Meal shape as it crosses the client→server boundary (food is a string id). */
export interface GeneratedMealInput {
  type: string;
  items: {
    food?: string | null;
    nameAr: string;
    nameEn: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    substitutes?: unknown[];
  }[];
}

export interface SaveGeneratedInput {
  nameAr: string;
  nameEn: string;
  targetCalories?: number;
  meals: GeneratedMealInput[];
}

export async function saveGeneratedTemplateAction(
  input: SaveGeneratedInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (!input.nameAr || !input.nameEn) return fail("الاسم مطلوب", "VALIDATION");
    const scope = await resolveScope();
    const id = await nt.createNutritionTemplate(scope, {
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      targetCalories: input.targetCalories,
      // Mongoose casts the string `food` ids to ObjectId on save.
      meals: input.meals as unknown as IMeal[],
    });
    revalidatePath("/coach/nutrition/templates");
    return ok({ id });
  });
}
