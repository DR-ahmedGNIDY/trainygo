"use server";

import { revalidatePath } from "next/cache";
import { canAccessNutrition } from "@/lib/permissions/team";
import * as imagePlans from "@/lib/services/nutrition-image-plans";
import { runAction, ok, fail, type ActionResult } from "./result";
import { getCoachAreaWriteCtxFor } from "./guards";

/**
 * Server actions for the image-based nutrition plan system. Kept in their own
 * file (rather than appended to `programs.ts`) so the structured-plan actions
 * stay exactly as they were.
 */

export interface ImagePlanFormInput {
  nameAr: string;
  nameEn: string;
  images: { url: string; publicId?: string }[];
  note?: string;
}

function validate(input: ImagePlanFormInput) {
  if (!input.nameAr?.trim() || !input.nameEn?.trim()) {
    return fail("الاسم مطلوب", "VALIDATION");
  }
  if (!Array.isArray(input.images) || input.images.length === 0) {
    return fail("يجب رفع صورة واحدة على الأقل", "VALIDATION");
  }
  return null;
}

export async function createNutritionImagePlanAction(
  clientId: string,
  input: ImagePlanFormInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const invalid = validate(input);
    if (invalid) return invalid;

    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    const id = await imagePlans.createNutritionImagePlan(coachId, clientId, input);
    revalidatePath("/coach/nutrition/plans");
    revalidatePath(`/coach/clients/${clientId}`);
    return ok({ id });
  });
}

export async function updateNutritionImagePlanAction(
  planId: string,
  input: ImagePlanFormInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const invalid = validate(input);
    if (invalid) return invalid;

    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await imagePlans.updateNutritionImagePlan(coachId, planId, input);
    revalidatePath("/coach/nutrition/plans");
    return ok();
  });
}

export async function archiveNutritionImagePlanAction(
  planId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await imagePlans.archiveNutritionImagePlan(coachId, planId);
    revalidatePath("/coach/nutrition/plans");
    return ok();
  });
}

export async function deleteNutritionImagePlanAction(
  planId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessNutrition);
    await imagePlans.deleteNutritionImagePlan(coachId, planId);
    revalidatePath("/coach/nutrition/plans");
    return ok();
  });
}
