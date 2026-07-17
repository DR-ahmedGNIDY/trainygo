import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { NutritionTemplate, type IMeal } from "@/models/NutritionTemplate";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { canMutateTemplate, type TemplateOwnership } from "@/lib/templates";
import {
  globalTemplateFilter,
  ownTemplateFilter,
  templateOwnershipFor,
  TEMPLATE_SORT,
} from "./template-visibility";

export type TplScope =
  | { role: "super_admin" }
  | { role: "coach"; coachId: string };

export interface NutritionTemplateInput {
  nameAr: string;
  nameEn: string;
  description?: { ar?: string; en?: string };
  targetCalories?: number;
  meals?: IMeal[];
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

const defaultMeals = (): IMeal[] => [
  { type: "breakfast", items: [] },
  { type: "lunch", items: [] },
  { type: "dinner", items: [] },
  { type: "snack", items: [] },
];

export async function listNutritionTemplates(scope: TplScope) {
  await connectToDatabase();
  const docs = await NutritionTemplate.find(visibility(scope)).sort(TEMPLATE_SORT).lean();
  return serialize(docs);
}

export async function getNutritionTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await NutritionTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  return doc ? serialize(doc) : null;
}

export async function createNutritionTemplate(scope: TplScope, input: NutritionTemplateInput) {
  await connectToDatabase();
  const doc = await NutritionTemplate.create({
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    description: input.description,
    targetCalories: input.targetCalories,
    meals: input.meals?.length ? input.meals : defaultMeals(),
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

export async function updateNutritionTemplate(id: string, scope: TplScope, input: NutritionTemplateInput) {
  await connectToDatabase();
  const tpl = await NutritionTemplate.findById(id);
  if (!tpl) return false;
  assertCanMutate(tpl, scope);
  tpl.nameAr = input.nameAr;
  tpl.nameEn = input.nameEn;
  if (input.description !== undefined) tpl.description = input.description;
  if (input.targetCalories !== undefined) tpl.targetCalories = input.targetCalories;
  if (input.meals !== undefined) tpl.meals = input.meals;
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
 * `version`; updateOne also avoids re-validating the whole meals tree.
 */
export async function setNutritionTemplateFeatured(
  id: string,
  scope: TplScope,
  featured: boolean,
) {
  await connectToDatabase();
  if (scope.role !== "super_admin") throw new PermissionError("Forbidden", "FORBIDDEN");
  if (!Types.ObjectId.isValid(id)) return false;
  const res = await NutritionTemplate.updateOne(
    { _id: id, ...globalTemplateFilter() },
    { $set: { featured } },
  );
  return res.matchedCount > 0;
}

export async function deleteNutritionTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const tpl = await NutritionTemplate.findById(id);
  if (!tpl) return false;
  assertCanMutate(tpl, scope);
  await tpl.deleteOne();
  return true;
}

/**
 * Duplicate a template the scope can see (official or own) into a NEW template
 * owned by the caller. A coach duplicating an official one gets a fully
 * independent coach-owned copy — custom meal names included. It starts at
 * version 1 and later edits to the source never reach it.
 */
export async function cloneNutritionTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const src = await NutritionTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  if (!src) return null;
  const copy = await NutritionTemplate.create({
    nameAr: `${src.nameAr} (نسخة)`,
    nameEn: `${src.nameEn} (copy)`,
    description: src.description,
    targetCalories: src.targetCalories,
    meals: src.meals,
    ...templateOwnershipFor(scope),
  });
  return copy._id.toString();
}
