"use server";

import { revalidatePath } from "next/cache";
import { getClientCtx, getClientWriteCtx } from "./guards";
import { runAction, ok, fail, type ActionResult } from "./result";
import { getOwnCoachId, updateOwnProfile, changeOwnPassword } from "@/lib/services/client-self";
import { submitCheckin } from "@/lib/services/checkins";
import { addMeasurement, type MeasurementInput } from "@/lib/services/progress";
import { logExercise, type LogExerciseInput } from "@/lib/services/workout-logs";
import { createWorkoutReport } from "@/lib/services/workout-reports";
import { workoutReportSchema, type WorkoutReportInput } from "@/lib/validations/workout-report";

export async function submitCheckinAction(
  answers: { key: string; value: string }[],
): Promise<ActionResult> {
  return runAction(async () => {
    const { clientId } = await getClientWriteCtx();
    await submitCheckin(clientId, answers);
    revalidatePath("/client/checkin");
    return ok();
  });
}

export async function addMeasurementAction(
  input: MeasurementInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const { clientId } = await getClientCtx();
    const coachId = await getOwnCoachId(clientId);
    if (!coachId) return fail("لا يوجد مدرب", "NO_COACH");
    await addMeasurement(clientId, coachId, input);
    revalidatePath("/client/progress");
    return ok();
  });
}

export async function updateOwnProfileAction(input: {
  name?: string;
  phone?: string;
  height?: number;
  weight?: number;
}): Promise<ActionResult> {
  return runAction(async () => {
    const { clientId } = await getClientCtx();
    await updateOwnProfile(clientId, input);
    revalidatePath("/client/profile");
    revalidatePath("/client");
    return ok();
  });
}

export async function changeOwnPasswordAction(
  current: string,
  next: string,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!next || next.length < 8) return fail("كلمة المرور 8 أحرف على الأقل", "WEAK");
    const { clientId } = await getClientCtx();
    const res = await changeOwnPassword(clientId, current, next);
    if (!res.ok) return fail("كلمة المرور الحالية غير صحيحة", res.error);
    return ok();
  });
}

export async function logExerciseAction(
  input: LogExerciseInput,
): Promise<ActionResult<{ oneRm: number }>> {
  return runAction(async () => {
    const { clientId } = await getClientCtx();
    const coachId = await getOwnCoachId(clientId);
    if (!coachId) return fail("لا يوجد مدرب", "NO_COACH");
    await logExercise(clientId, coachId, input);
    revalidatePath("/client/workout");
    const { bestOneRm } = await import("@/lib/services/workout-logs");
    return ok({ oneRm: bestOneRm(input.sets) });
  });
}

export async function submitWorkoutReportAction(
  input: WorkoutReportInput,
): Promise<ActionResult<{ id: string; whatsappLink: string | null }>> {
  return runAction(async () => {
    const parsed = workoutReportSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { clientId } = await getClientWriteCtx();
    const coachId = await getOwnCoachId(clientId);
    if (!coachId) return fail("لا يوجد مدرب", "NO_COACH");
    const res = await createWorkoutReport(clientId, coachId, parsed.data);
    revalidatePath("/client/workout");
    revalidatePath("/coach/workout-reports");
    return ok(res);
  });
}
