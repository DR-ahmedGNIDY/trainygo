"use server";

import { revalidatePath } from "next/cache";
import { resolveCoachAreaScope } from "./guards";
import { canAccessTemplates } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import * as wt from "@/lib/services/workout-templates";
import * as nt from "@/lib/services/nutrition-templates";
import type { ClientGoal } from "@/lib/constants";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";
import type { IMeal } from "@/models/NutritionTemplate";

type Scope = { role: "super_admin" } | { role: "coach"; coachId: string };

async function resolveScope(): Promise<Scope> {
  return resolveCoachAreaScope(canAccessTemplates);
}

/* ---- Workout templates ---- */

export interface WorkoutTplInput {
  nameAr: string;
  nameEn: string;
  goal?: ClientGoal;
  descriptionAr?: string;
  descriptionEn?: string;
}

export async function createWorkoutTemplateAction(
  input: WorkoutTplInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (!input.nameAr || !input.nameEn) return fail("الاسم مطلوب", "VALIDATION");
    const scope = await resolveScope();
    const id = await wt.createWorkoutTemplate(scope, {
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      goal: input.goal,
      description: { ar: input.descriptionAr, en: input.descriptionEn },
    });
    revalidatePath("/coach/templates");
    return ok({ id });
  });
}

export async function cloneWorkoutTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const newId = await wt.cloneWorkoutTemplate(id, scope);
    if (!newId) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/templates");
    return ok();
  });
}

export async function deleteWorkoutTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await wt.deleteWorkoutTemplate(id, scope);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/templates");
    return ok();
  });
}

export async function saveWorkoutTemplateBuilderAction(
  id: string,
  input: { nameAr: string; nameEn: string; goal?: ClientGoal; weeks: IWorkoutWeek[] },
): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await wt.updateWorkoutTemplate(id, scope, input);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/templates");
    revalidatePath(`/coach/templates/${id}`);
    return ok();
  });
}

/* ---- Nutrition templates ---- */

export interface NutritionTplInput {
  nameAr: string;
  nameEn: string;
  targetCalories?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

export async function createNutritionTemplateAction(
  input: NutritionTplInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (!input.nameAr || !input.nameEn) return fail("الاسم مطلوب", "VALIDATION");
    const scope = await resolveScope();
    const id = await nt.createNutritionTemplate(scope, {
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      targetCalories: input.targetCalories,
      description: { ar: input.descriptionAr, en: input.descriptionEn },
    });
    revalidatePath("/coach/nutrition/templates");
    return ok({ id });
  });
}

export async function cloneNutritionTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const newId = await nt.cloneNutritionTemplate(id, scope);
    if (!newId) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/nutrition/templates");
    return ok();
  });
}

export async function deleteNutritionTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await nt.deleteNutritionTemplate(id, scope);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/nutrition/templates");
    return ok();
  });
}

export async function saveNutritionTemplateBuilderAction(
  id: string,
  input: { nameAr: string; nameEn: string; targetCalories?: number; meals: IMeal[] },
): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await nt.updateNutritionTemplate(id, scope, input);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/nutrition/templates");
    revalidatePath(`/coach/nutrition/templates/${id}`);
    return ok();
  });
}
