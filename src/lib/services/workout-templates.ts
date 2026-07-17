import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutTemplate, type IWorkoutWeek } from "@/models/WorkoutTemplate";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { isGlobalTemplate, type CreatorFields } from "@/models/template-creator";
import type { ClientGoal } from "@/lib/constants";
import { normalizeGoal } from "@/lib/utils/goals";
import {
  globalTemplateFilter,
  ownTemplateFilter,
  TEMPLATE_SORT,
} from "./template-visibility";

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

/**
 * What this scope is allowed to read: a coach sees their own templates plus the
 * global ones and never another coach's; a super admin manages the global ones.
 */
function visibility(scope: TplScope) {
  if (scope.role === "coach") {
    return { $or: [globalTemplateFilter(), ownTemplateFilter(scope.coachId)] };
  }
  return globalTemplateFilter();
}

const emptyWeek = (): IWorkoutWeek => ({
  weekNumber: 1,
  name: { ar: "الأسبوع 1", en: "Week 1" },
  days: [],
});

export async function listWorkoutTemplates(scope: TplScope) {
  await connectToDatabase();
  const docs = await WorkoutTemplate.find(visibility(scope)).sort(TEMPLATE_SORT).lean();
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
  const doc = await WorkoutTemplate.create({
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    goal: normalizeGoal(input.goal),
    description: input.description,
    weeks: input.weeks?.length ? input.weeks : [emptyWeek()],
    ...ownershipFor(scope),
  });
  return doc._id.toString();
}

/**
 * Ownership fields for a template this scope is creating. Only a super admin
 * can author a global one — a coach scope always yields a coach-owned template.
 * `isSystemTemplate` is derived by the model's pre-save hook.
 */
function ownershipFor(scope: TplScope) {
  return scope.role === "super_admin"
    ? { createdByType: "super_admin" as const, createdByCoach: null }
    : {
        createdByType: "coach" as const,
        createdByCoach: new Types.ObjectId(scope.coachId),
      };
}

/**
 * A coach may only mutate their OWN templates — never a global one (read-only
 * for them: duplicate/assign/preview instead) and never another coach's.
 */
function assertCanMutate(tpl: CreatorFields & { createdByCoach?: Types.ObjectId | null }, scope: TplScope) {
  const global = isGlobalTemplate(tpl);
  if (scope.role === "super_admin") {
    if (!global) throw new PermissionError("Forbidden", "FORBIDDEN");
  } else if (global || String(tpl.createdByCoach) !== scope.coachId) {
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

/**
 * Duplicate a template the scope can see (global or own) into a NEW template
 * owned by the caller. A coach duplicating a global one gets a fully
 * independent coach-owned copy they may then edit freely.
 */
export async function cloneWorkoutTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const src = await WorkoutTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  if (!src) return null;
  const copy = await WorkoutTemplate.create({
    nameAr: `${src.nameAr} (نسخة)`,
    nameEn: `${src.nameEn} (copy)`,
    goal: normalizeGoal(src.goal),
    description: src.description,
    weeks: src.weeks, // deep structural copy (embedded, no shared refs)
    ...ownershipFor(scope),
  });
  return copy._id.toString();
}
