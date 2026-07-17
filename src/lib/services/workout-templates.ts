import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutTemplate, type IWorkoutWeek } from "@/models/WorkoutTemplate";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { canMutateTemplate, type TemplateOwnership } from "@/lib/templates";
import type { ClientGoal } from "@/lib/constants";
import { normalizeGoal } from "@/lib/utils/goals";
import {
  globalTemplateFilter,
  ownTemplateFilter,
  templateOwnershipFor,
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
    ...templateOwnershipFor(scope),
  });
  return doc._id.toString();
}

/**
 * A coach may only mutate their OWN templates — never an official one
 * (read-only for them: duplicate/assign/preview instead) and never another
 * coach's.
 */
function assertCanMutate(tpl: TemplateOwnership, scope: TplScope) {
  if (!canMutateTemplate(tpl, scope)) {
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
  // Content changed -> new version. `?? 1` covers documents written before the
  // field existed, so their first edit lands on 2 rather than NaN.
  tpl.version = (tpl.version ?? 1) + 1;
  await tpl.save();
  return true;
}

/**
 * Pin/unpin a template to the top of every coach's list. Super admin only, and
 * only for official templates — a coach's private template is not the super
 * admin's to promote. Featuring is not a content edit, so it does NOT bump
 * `version`; updateOne also avoids re-validating the whole weeks tree.
 */
export async function setWorkoutTemplateFeatured(
  id: string,
  scope: TplScope,
  featured: boolean,
) {
  await connectToDatabase();
  if (scope.role !== "super_admin") throw new PermissionError("Forbidden", "FORBIDDEN");
  if (!Types.ObjectId.isValid(id)) return false;
  const res = await WorkoutTemplate.updateOne(
    { _id: id, ...globalTemplateFilter() },
    { $set: { featured } },
  );
  return res.matchedCount > 0;
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
 * Duplicate a template the scope can see (official or own) into a NEW template
 * owned by the caller. A coach duplicating an official one gets a fully
 * independent coach-owned copy they may then edit freely: it starts at
 * version 1 and later edits to the source never reach it.
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
    ...templateOwnershipFor(scope),
  });
  return copy._id.toString();
}
