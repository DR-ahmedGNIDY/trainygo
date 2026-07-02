"use server";

import { revalidatePath } from "next/cache";
import { getCoachAreaWriteCtxFor } from "./guards";
import { canAccessWorkout, canAccessNutrition } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import * as programs from "@/lib/services/programs";
import * as plans from "@/lib/services/nutrition-plans";
import * as copy from "@/lib/services/copy";
import type { CopyWhat } from "@/lib/services/copy";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";
import type { IMeal } from "@/models/NutritionTemplate";
import { logError } from "@/lib/logging/error-log";

/* ---- Workout programs ---- */

export async function assignTemplateAction(
  templateId: string,
  clientId: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessWorkout);
    let id: string;
    try {
      id = await programs.assignTemplateToClient(coachId, templateId, clientId);
    } catch (error) {
      await logError(
        {
          type: "ASSIGN_TEMPLATE_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          coachId,
          route: "/coach/programs",
          action: "assignTemplate",
          context: { templateId, clientId },
        },
        error,
      );
      throw error;
    }
    revalidatePath("/coach/programs");
    revalidatePath(`/coach/clients/${clientId}`);
    return ok({ id });
  });
}

export async function createBlankProgramAction(
  clientId: string,
  input: { nameAr: string; nameEn: string },
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (!input.nameAr || !input.nameEn) return fail("الاسم مطلوب", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessWorkout);
    const id = await programs.createBlankProgram(coachId, clientId, input);
    revalidatePath(`/coach/clients/${clientId}`);
    return ok({ id });
  });
}

export async function saveProgramBuilderAction(
  programId: string,
  input: { nameAr: string; nameEn: string; weeks: IWorkoutWeek[] },
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessWorkout);
    await programs.updateProgramWeeks(coachId, programId, input);
    revalidatePath("/coach/programs");
    revalidatePath(`/coach/programs/${programId}`);
    return ok();
  });
}

export async function archiveProgramAction(programId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessWorkout);
    await programs.archiveProgram(coachId, programId);
    revalidatePath("/coach/programs");
    return ok();
  });
}

export async function deleteProgramAction(programId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessWorkout);
    await programs.deleteProgram(coachId, programId);
    revalidatePath("/coach/programs");
    return ok();
  });
}

/* ---- Nutrition plans ---- */

export async function assignNutritionTemplateAction(
  templateId: string,
  clientId: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    const id = await plans.assignNutritionTemplateToClient(coachId, templateId, clientId);
    revalidatePath("/coach/nutrition/plans");
    revalidatePath(`/coach/clients/${clientId}`);
    return ok({ id });
  });
}

export async function createBlankNutritionPlanAction(
  clientId: string,
  input: { nameAr: string; nameEn: string },
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (!input.nameAr || !input.nameEn) return fail("الاسم مطلوب", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    const id = await plans.createBlankNutritionPlan(coachId, clientId, input);
    revalidatePath(`/coach/clients/${clientId}`);
    return ok({ id });
  });
}

export async function savePlanBuilderAction(
  planId: string,
  meals: IMeal[],
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await plans.updatePlanMeals(coachId, planId, meals);
    revalidatePath("/coach/nutrition/plans");
    revalidatePath(`/coach/nutrition/plans/${planId}`);
    return ok();
  });
}

export async function archiveNutritionPlanAction(planId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await plans.archiveNutritionPlan(coachId, planId);
    revalidatePath("/coach/nutrition/plans");
    return ok();
  });
}

export async function deleteNutritionPlanAction(planId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await plans.deleteNutritionPlan(coachId, planId);
    revalidatePath("/coach/nutrition/plans");
    return ok();
  });
}

/* ---- Copy system ---- */

export async function copyTemplatesToClientsAction(
  source: { workoutTemplateId?: string; nutritionTemplateId?: string },
  clientIds: string[],
): Promise<ActionResult<{ programs: number; plans: number }>> {
  return runAction(async () => {
    if (clientIds.length === 0) return fail("اختر عميلاً واحداً على الأقل", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor((ctx) => canAccessWorkout(ctx) || canAccessNutrition(ctx));
    let res: { programs: number; plans: number };
    try {
      res = await copy.copyTemplatesToClients(coachId, source, clientIds);
    } catch (error) {
      await logError(
        {
          type: "COPY_PROGRAM_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          coachId,
          route: "/coach/programs",
          action: "copyTemplatesToClients",
          context: { ...source, clientIds },
        },
        error,
      );
      throw error;
    }
    revalidatePath("/coach/programs");
    revalidatePath("/coach/nutrition/plans");
    return ok(res);
  });
}

export async function copyClientToClientsAction(
  fromClientId: string,
  what: CopyWhat,
  clientIds: string[],
): Promise<ActionResult<{ programs: number; plans: number }>> {
  return runAction(async () => {
    if (clientIds.length === 0) return fail("اختر عميلاً واحداً على الأقل", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor((ctx) => canAccessWorkout(ctx) || canAccessNutrition(ctx));
    let res: { programs: number; plans: number };
    try {
      res = await copy.copyClientToClients(coachId, fromClientId, what, clientIds);
    } catch (error) {
      await logError(
        {
          type: "COPY_PROGRAM_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          coachId,
          route: "/coach/programs",
          action: "copyClientToClients",
          context: { fromClientId, what, clientIds },
        },
        error,
      );
      throw error;
    }
    revalidatePath("/coach/programs");
    revalidatePath("/coach/nutrition/plans");
    return ok(res);
  });
}
