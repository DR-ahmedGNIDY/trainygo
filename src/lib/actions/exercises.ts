"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCoachCanWrite, PermissionError } from "@/lib/permissions";
import { runAction, ok, fail, type ActionResult } from "./result";
import { exerciseSchema, type ExerciseInput } from "@/lib/validations/exercise";
import * as exercises from "@/lib/services/exercises";
import type { ExerciseScope } from "@/lib/services/exercises";

async function resolveScope(): Promise<ExerciseScope> {
  const session = await auth();
  if (session?.user?.role === "super_admin") return { role: "super_admin" };
  if (session?.user?.role === "coach") {
    assertCoachCanWrite(session.user.status);
    return { role: "coach", coachId: session.user.id };
  }
  throw new PermissionError("Forbidden", "FORBIDDEN");
}

function revalidate() {
  revalidatePath("/admin/exercises");
  revalidatePath("/coach/exercises");
}

export async function createExerciseAction(
  input: ExerciseInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = exerciseSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const scope = await resolveScope();
    const id = await exercises.createExercise(scope, parsed.data);
    revalidate();
    return ok({ id });
  });
}

export async function updateExerciseAction(
  id: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = exerciseSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const scope = await resolveScope();
    const done = await exercises.updateExercise(id, scope, parsed.data);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidate();
    return ok();
  });
}

export interface ExercisePickerItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  targetMuscles?: string[];
  imageUrlStart?: string;
  imageUrlEnd?: string;
  gifUrl?: string;
}

export async function searchExercisesAction(
  query: string,
  category?: string,
  visibility?: "all" | "system" | "mine",
): Promise<ActionResult<{ items: ExercisePickerItem[] }>> {
  return runAction(async () => {
    const scope = await resolveScope();
    const res = await exercises.listExercises(scope, { query, category, visibility, limit: 30 });
    const items = (
      res.items as unknown as {
        _id: string;
        nameAr: string;
        nameEn: string;
        category: string;
        targetMuscles?: string[];
        imageUrlStart?: string;
        imageUrlEnd?: string;
        gifUrl?: string;
      }[]
    ).map((e) => ({
      id: String(e._id),
      nameAr: e.nameAr,
      nameEn: e.nameEn,
      category: e.category,
      targetMuscles: e.targetMuscles,
      imageUrlStart: e.imageUrlStart,
      imageUrlEnd: e.imageUrlEnd,
      gifUrl: e.gifUrl,
    }));
    return ok({ items });
  });
}

export async function deleteExerciseAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const scope = await resolveScope();
    const done = await exercises.deleteExercise(id, scope);
    if (!done) return fail("غير موجود", "NOT_FOUND");
    revalidate();
    return ok();
  });
}
