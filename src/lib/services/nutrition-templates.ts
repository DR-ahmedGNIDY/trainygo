import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { NutritionTemplate, type IMeal } from "@/models/NutritionTemplate";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";

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

const defaultMeals = (): IMeal[] => [
  { type: "breakfast", items: [] },
  { type: "lunch", items: [] },
  { type: "dinner", items: [] },
  { type: "snack", items: [] },
];

export async function listNutritionTemplates(scope: TplScope) {
  await connectToDatabase();
  const docs = await NutritionTemplate.find(visibility(scope))
    .sort({ isSystemTemplate: -1, createdAt: -1 })
    .lean();
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
  const isSystem = scope.role === "super_admin";
  const doc = await NutritionTemplate.create({
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    description: input.description,
    targetCalories: input.targetCalories,
    meals: input.meals?.length ? input.meals : defaultMeals(),
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
  await tpl.save();
  return true;
}

export async function deleteNutritionTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const tpl = await NutritionTemplate.findById(id);
  if (!tpl) return false;
  assertCanMutate(tpl, scope);
  await tpl.deleteOne();
  return true;
}

export async function cloneNutritionTemplate(id: string, scope: TplScope) {
  await connectToDatabase();
  const src = await NutritionTemplate.findOne({ _id: id, ...visibility(scope) }).lean();
  if (!src) return null;
  const isSystem = scope.role === "super_admin";
  const copy = await NutritionTemplate.create({
    nameAr: `${src.nameAr} (نسخة)`,
    nameEn: `${src.nameEn} (copy)`,
    description: src.description,
    targetCalories: src.targetCalories,
    meals: src.meals,
    isSystemTemplate: isSystem,
    createdByCoach: isSystem ? null : new Types.ObjectId((scope as { coachId: string }).coachId),
  });
  return copy._id.toString();
}
