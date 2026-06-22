import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { NutritionPlan } from "@/models/NutritionPlan";
import { NutritionTemplate, type IMeal } from "@/models/NutritionTemplate";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { computePlanTotals } from "./nutrition-calc";
import { createNotification } from "./notifications";

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

async function assertOwnsClient(coachId: string, clientId: string) {
  const exists = await User.exists({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
  if (!exists) throw new PermissionError("Client not found", "NOT_FOUND");
}

export async function listNutritionPlans(
  coachId: string,
  opts: { clientId?: string; status?: "active" | "archived" } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (opts.clientId) filter.client = new Types.ObjectId(opts.clientId);
  if (opts.status) filter.status = opts.status;
  const docs = await NutritionPlan.find(filter)
    .populate("client", "name clientProfile.clientCode")
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

export async function getActivePlan(coachId: string, clientId: string) {
  await connectToDatabase();
  const doc = await NutritionPlan.findOne({
    coach: new Types.ObjectId(coachId),
    client: new Types.ObjectId(clientId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}

/** Assign a nutrition template to a client as an independent deep copy. */
export async function assignNutritionTemplateToClient(
  coachId: string,
  templateId: string,
  clientId: string,
) {
  await connectToDatabase();
  await assertOwnsClient(coachId, clientId);

  const tpl = await NutritionTemplate.findOne({
    _id: templateId,
    $or: [
      { isSystemTemplate: true },
      { createdByCoach: new Types.ObjectId(coachId) },
    ],
  }).lean();
  if (!tpl) throw new PermissionError("Template not found", "NOT_FOUND");

  const meals = deepClone(tpl.meals) as IMeal[];
  const plan = await NutritionPlan.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    sourceTemplate: tpl._id,
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    meals,
    totals: computePlanTotals(meals),
    status: "active",
  });

  await createNotification({
    recipient: clientId,
    type: "new_nutrition_plan",
    titleAr: "تم إسناد خطة تغذية جديدة لك",
    titleEn: "A new nutrition plan was assigned to you",
    link: "/client/nutrition",
  });

  return plan._id.toString();
}

export async function getNutritionPlan(coachId: string, planId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(planId)) return null;
  const doc = await NutritionPlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  })
    .populate("client", "name clientProfile.clientCode")
    .lean();
  return doc ? serialize(doc) : null;
}

export async function updatePlanMeals(coachId: string, planId: string, meals: IMeal[]) {
  await connectToDatabase();
  const plan = await NutritionPlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  });
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");
  plan.meals = meals;
  plan.totals = computePlanTotals(meals);
  await plan.save();
  return true;
}

export async function duplicateNutritionPlan(
  coachId: string,
  planId: string,
  toClientId: string,
) {
  await connectToDatabase();
  const src = await NutritionPlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  }).lean();
  if (!src) throw new PermissionError("Plan not found", "NOT_FOUND");
  await assertOwnsClient(coachId, toClientId);

  const copy = await NutritionPlan.create({
    client: new Types.ObjectId(toClientId),
    coach: new Types.ObjectId(coachId),
    sourceTemplate: src.sourceTemplate ?? null,
    nameAr: src.nameAr,
    nameEn: src.nameEn,
    meals: deepClone(src.meals),
    totals: src.totals,
    status: "active",
  });
  return copy._id.toString();
}

export async function archiveNutritionPlan(coachId: string, planId: string) {
  await connectToDatabase();
  const res = await NutritionPlan.updateOne(
    { _id: planId, coach: new Types.ObjectId(coachId) },
    { $set: { status: "archived" } },
  );
  return res.matchedCount > 0;
}

export async function deleteNutritionPlan(coachId: string, planId: string) {
  await connectToDatabase();
  const res = await NutritionPlan.deleteOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  });
  return res.deletedCount > 0;
}
