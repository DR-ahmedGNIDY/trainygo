import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutTemplate, type IWorkoutWeek } from "@/models/WorkoutTemplate";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import type { ClientGoal } from "@/lib/constants";
import { normalizeGoal } from "@/lib/utils/goals";

export type TplScope =
  | { role: "super_admin" }
  | { role: "coach"; coachId: string };

export interface WorkoutTemplateInput {
  nameAr: string;
  nameEn: string;
  goal?: ClientGoal;
  description?: { ar?: string; en?: string };
  weeks?: IWorkoutWeek[];
}

function visibility(scope: TplScope) {
  if (scope.role === "coach") {
    return {
      $or: [
        { isSystemTemplate: true },
        { createdByCoach: new Types.ObjectId(scope.coachId) },
      ],
    };
  }
  return { isSystemTemplate: true };
}

const emptyWeek = (): IWorkoutWeek => ({
  weekNumber: 1,
  name: { ar: "الأسبوع 1", en: "Week 1" },
  days: [],
});

export async function listWorkoutTemplates(scope: TplScope) {
  await connectToDatabase();
  const docs = await WorkoutTemplate.find(visibility(scope))
    .sort({ isSystemTemplate: -1, createdAt: -1 })
    .lean();
  return serialize(docs);
}

export async function getWorkoutTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await WorkoutTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  return doc ? serialize(doc) : null;
}

export async function createWorkoutTemplate(scope: TplScope, input: WorkoutTemplateInput) {
  await connectToDatabase();
  const isSystem = scope.role === "super_admin";
  const doc = await WorkoutTemplate.create({
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    goal: normalizeGoal(input.goal),
    description: input.description,
    weeks: input.weeks?.length ? input.weeks : [emptyWeek()],
    isSystemTemplate: isSystem,
    createdByCoach: isSystem ? null : new Types.ObjectId((scope as { coachId: string }).coachId),
  });
  return doc._id.toString();
}

function assertCanMutate(
  tpl: { isSystemTemplate: boolean; createdByCoach?: Types.ObjectId | null },
  scope: TplScope,
) {
  if (scope.role === "super_admin") {
    if (!tpl.isSystemTemplate) throw new PermissionError("Forbidden", "FORBIDDEN");
  } else if (tpl.isSystemTemplate || String(tpl.createdByCoach) !== scope.coachId) {
    throw new PermissionError("Forbidden", "FORBIDDEN");
  }
}

export async function updateWorkoutTemplate(id: string, scope: TplScope, input: WorkoutTemplateInput) {
  await connectToDatabase();
  const tpl = await WorkoutTemplate.findById(id);
  if (!tpl) return false;
  assertCanMutate(tpl, scope);
  tpl.nameAr = input.nameAr;
  tpl.nameEn = input.nameEn;
  if (input.goal !== undefined) tpl.goal = normalizeGoal(input.goal);
  if (input.description !== undefined) tpl.description = input.description;
  if (input.weeks !== undefined) tpl.weeks = input.weeks;
  await tpl.save();
  return true;
}

export async function deleteWorkoutTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const tpl = await WorkoutTemplate.findById(id);
  if (!tpl) return false;
  assertCanMutate(tpl, scope);
  await tpl.deleteOne();
  return true;
}

/** Clone a template (system or own) into the coach's own private templates. */
export async function cloneWorkoutTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const src = await WorkoutTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  if (!src) return null;
  const isSystem = scope.role === "super_admin";
  const copy = await WorkoutTemplate.create({
    nameAr: `${src.nameAr} (نسخة)`,
    nameEn: `${src.nameEn} (copy)`,
    goal: src.goal,
    description: src.description,
    weeks: src.weeks, // deep structural copy (embedded, no shared refs)
    isSystemTemplate: isSystem,
    createdByCoach: isSystem ? null : new Types.ObjectId((scope as { coachId: string }).coachId),
  });
  return copy._id.toString();
}
