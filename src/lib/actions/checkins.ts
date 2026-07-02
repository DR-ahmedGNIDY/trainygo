"use server";

import { revalidatePath } from "next/cache";
import { getCoachAreaWriteCtxFor } from "./guards";
import { canAccessRecovery } from "@/lib/permissions/team";
import { runAction, ok, type ActionResult } from "./result";
import { reviewResponse, archiveForm } from "@/lib/services/checkins";

export async function reviewResponseAction(
  responseId: string,
  feedback?: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessRecovery);
    await reviewResponse(coachId, responseId, feedback);
    revalidatePath("/coach/progress/checkins");
    return ok();
  });
}

export async function archiveCheckinFormAction(formId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canAccessRecovery);
    await archiveForm(coachId, formId);
    revalidatePath("/coach/progress/checkins");
    return ok();
  });
}
