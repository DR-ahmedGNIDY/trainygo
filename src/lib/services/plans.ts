import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { serialize } from "@/lib/serialize";
import type { PlanTier } from "@/lib/constants";

export interface PlanInput {
  tier: PlanTier;
  nameAr: string;
  nameEn: string;
  price: number;
  durationDays: number;
  maxClients: number;
  featuresAr?: string[];
  featuresEn?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export async function listPlans(activeOnly = false) {
  await connectToDatabase();
  const filter = activeOnly ? { isActive: true } : {};
  const docs = await Plan.find(filter).sort({ sortOrder: 1, price: 1 }).lean();
  return serialize(docs);
}

function toFeatures(ar?: string[], en?: string[]) {
  const len = Math.max(ar?.length ?? 0, en?.length ?? 0);
  return Array.from({ length: len }).map((_, i) => ({ ar: ar?.[i] ?? "", en: en?.[i] ?? "" }));
}

export async function createPlan(input: PlanInput) {
  await connectToDatabase();
  const doc = await Plan.create({
    tier: input.tier,
    name: { ar: input.nameAr, en: input.nameEn },
    price: input.price,
    durationDays: input.durationDays,
    maxClients: input.maxClients,
    features: toFeatures(input.featuresAr, input.featuresEn),
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  });
  return doc._id.toString();
}

export async function updatePlan(id: string, input: PlanInput) {
  await connectToDatabase();
  const res = await Plan.updateOne(
    { _id: id },
    {
      $set: {
        tier: input.tier,
        name: { ar: input.nameAr, en: input.nameEn },
        price: input.price,
        durationDays: input.durationDays,
        maxClients: input.maxClients,
        features: toFeatures(input.featuresAr, input.featuresEn),
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    },
  );
  return res.matchedCount > 0;
}

export async function deletePlan(id: string) {
  await connectToDatabase();
  const res = await Plan.deleteOne({ _id: id });
  return res.deletedCount > 0;
}
