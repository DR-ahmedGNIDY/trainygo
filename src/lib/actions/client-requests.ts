"use server";

import { revalidatePath } from "next/cache";
import { getClientWriteCtx, getCoachAreaWriteCtxFor } from "./guards";
import { canAccessWorkout } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import {
  createExerciseChangeRequest,
  approveExerciseChangeRequest,
  rejectExerciseChangeRequest,
} from "@/lib/services/client-requests";
import {
  exerciseChangeRequestSchema,
  approveExerciseChangeSchema,
  type ExerciseChangeRequestInput,
  type ApproveExerciseChangeInput,
} from "@/lib/validations/client-request";

/** Client: submit a request to change an exercise in their assigned program. */
export async function createExerciseChangeRequestAction(
  input: ExerciseChangeRequestInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = exerciseChangeRequestSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { clientId } = await getClientWriteCtx();
    const res = await createExerciseChangeRequest(clientId, parsed.data);
    revalidatePath("/client/workout");
    revalidatePath("/coach/exercise-change-requests");
    return ok(res);
  });
}

/**
 * Coach (or a team member with canAccessWorkout): approve a request by
 * swapping in a replacement exercise. Write-gated (expired/suspended owner is
 * read-only). Nutrition specialists / academy managers lack canAccessWorkout
 * and are blocked here even though they can view the list.
 */
export async function approveExerciseChangeRequestAction(
  requestId: string,
  input: ApproveExerciseChangeInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = approveExerciseChangeSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const ctx = await getCoachAreaWriteCtxFor(canAccessWorkout);
    const res = await approveExerciseChangeRequest(ctx.coachId, ctx.actingUserId, requestId, parsed.data);
    revalidatePath("/coach/exercise-change-requests");
    return ok(res);
  });
}

/** Coach (or a team member with canAccessWorkout): reject a request with an optional note. */
export async function rejectExerciseChangeRequestAction(
  requestId: string,
  coachNote?: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    if (coachNote && coachNote.length > 500) return fail("الملاحظة طويلة جداً", "VALIDATION");
    const ctx = await getCoachAreaWriteCtxFor(canAccessWorkout);
    const res = await rejectExerciseChangeRequest(ctx.coachId, ctx.actingUserId, requestId, coachNote);
    revalidatePath("/coach/exercise-change-requests");
    return ok(res);
  });
}
