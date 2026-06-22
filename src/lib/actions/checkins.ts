"use server";

import { revalidatePath } from "next/cache";
import { getCoachWriteCtx } from "./guards";
import { runAction, ok, type ActionResult } from "./result";
import { reviewResponse, archiveForm } from "@/lib/services/checkins";

export async function reviewResponseAction(
  responseId: string,
  feedback?: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachWriteCtx();
    await reviewResponse(coachId, responseId, feedback);
    revalidatePath("/coach/progress/checkins");
    return ok();
  });
}

export async function archiveCheckinFormAction(formId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachWriteCtx();
    await archiveForm(coachId, formId);
    revalidatePath("/coach/progress/checkins");
    return ok();
  });
}
