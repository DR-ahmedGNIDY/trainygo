import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { NutritionImagePlan, type INutritionImagePlanImage } from "@/models/NutritionImagePlan";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { destroyCloudinaryAssets } from "@/lib/media/cloudinary-destroy";
import { createNotification } from "./notifications";

/**
 * Image-based nutrition plans — the parallel system to `nutrition-plans.ts`.
 * Deliberately duplicates the small ownership/archive helpers rather than
 * sharing them, so nothing here can regress the structured plan flow.
 */

export interface ImagePlanInput {
  nameAr: string;
  nameEn: string;
  images: { url: string; publicId?: string }[];
  note?: string;
}

async function assertOwnsClient(coachId: string, clientId: string) {
  const exists = await User.exists({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
  if (!exists) throw new PermissionError("Client not found", "NOT_FOUND");
}

/** Normalizes incoming images into ordered, deduped subdocuments. */
function toImageDocs(images: ImagePlanInput["images"]): INutritionImagePlanImage[] {
  return images
    .filter((img) => typeof img?.url === "string" && img.url.trim().length > 0)
    .map((img, i) => ({
      url: img.url.trim(),
      publicId: img.publicId,
      order: i,
    }));
}

export async function listNutritionImagePlans(
  coachId: string,
  opts: { clientId?: string; status?: "active" | "archived" } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (opts.clientId) filter.client = new Types.ObjectId(opts.clientId);
  if (opts.status) filter.status = opts.status;
  const docs = await NutritionImagePlan.find(filter)
    .populate("client", "name clientProfile.clientCode")
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

export async function getNutritionImagePlan(coachId: string, planId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(planId)) return null;
  const doc = await NutritionImagePlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  })
    .populate("client", "name clientProfile.clientCode")
    .lean();
  return doc ? serialize(doc) : null;
}

export async function createNutritionImagePlan(
  coachId: string,
  clientId: string,
  input: ImagePlanInput,
) {
  await connectToDatabase();
  await assertOwnsClient(coachId, clientId);

  const images = toImageDocs(input.images);
  if (images.length === 0) {
    throw new PermissionError("At least one image is required", "VALIDATION");
  }

  const plan = await NutritionImagePlan.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    images,
    note: input.note,
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

export async function updateNutritionImagePlan(
  coachId: string,
  planId: string,
  input: ImagePlanInput,
) {
  await connectToDatabase();
  const images = toImageDocs(input.images);
  if (images.length === 0) {
    throw new PermissionError("At least one image is required", "VALIDATION");
  }
  const plan = await NutritionImagePlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  });
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");

  // Images the coach removed in this edit are no longer referenced anywhere,
  // so their Cloudinary originals go too.
  const keptIds = new Set(images.map((img) => img.publicId).filter(Boolean));
  const droppedIds = plan.images
    .map((img) => img.publicId)
    .filter((id) => id && !keptIds.has(id));

  plan.nameAr = input.nameAr;
  plan.nameEn = input.nameEn;
  plan.images = images;
  plan.note = input.note;
  await plan.save();

  await destroyCloudinaryAssets(droppedIds, {
    route: "nutrition-image-plans",
    action: "updateNutritionImagePlan",
    coachId,
  });
  return true;
}

export async function archiveNutritionImagePlan(coachId: string, planId: string) {
  await connectToDatabase();
  const res = await NutritionImagePlan.updateOne(
    { _id: planId, coach: new Types.ObjectId(coachId) },
    { $set: { status: "archived" } },
  );
  return res.matchedCount > 0;
}

export async function deleteNutritionImagePlan(coachId: string, planId: string) {
  await connectToDatabase();
  // Read the public ids BEFORE deleting the row — afterwards there is nothing
  // left pointing at the Cloudinary originals.
  const plan = await NutritionImagePlan.findOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  })
    .select("images.publicId")
    .lean();
  if (!plan) return false;

  const res = await NutritionImagePlan.deleteOne({
    _id: planId,
    coach: new Types.ObjectId(coachId),
  });
  if (res.deletedCount === 0) return false;

  await destroyCloudinaryAssets(
    (plan.images ?? []).map((img) => img.publicId),
    { route: "nutrition-image-plans", action: "deleteNutritionImagePlan", coachId },
  );
  return true;
}

/** The client's own newest active image plan (used by the client dashboard). */
export async function getOwnActiveImagePlan(clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return null;
  const doc = await NutritionImagePlan.findOne({
    client: new Types.ObjectId(clientId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}
