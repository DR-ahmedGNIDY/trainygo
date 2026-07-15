import type { UpdateQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Plan, type IPlan } from "@/models/Plan";
import { serialize } from "@/lib/serialize";
import type { PlanTier } from "@/lib/constants";

export interface PlanInput {
  tier: PlanTier;
  nameAr: string;
  nameEn: string;
  price: number;
  durationMonths: number;
  maxClients: number;
  /** Omit / undefined = unlimited team members for subscribers of this plan. */
  maxTeamMembers?: number;
  featuresAr?: string[];
  featuresEn?: string[];
  branding?: boolean;
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
    durationMonths: input.durationMonths,
    maxClients: input.maxClients,
    maxTeamMembers: input.maxTeamMembers,
    features: toFeatures(input.featuresAr, input.featuresEn),
    planFeatures: { branding: input.branding ?? false },
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  });
  return doc._id.toString();
}

export async function updatePlan(id: string, input: PlanInput) {
  await connectToDatabase();
  const set: Record<string, unknown> = {
    tier: input.tier,
    name: { ar: input.nameAr, en: input.nameEn },
    price: input.price,
    durationMonths: input.durationMonths,
    maxClients: input.maxClients,
    features: toFeatures(input.featuresAr, input.featuresEn),
    planFeatures: { branding: input.branding ?? false },
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  };
  const update: UpdateQuery<IPlan> = { $set: set };
  // Clearing the cap must remove the field (= unlimited), not leave the old
  // number behind — Mongoose drops undefined from $set, so unset explicitly.
  if (typeof input.maxTeamMembers === "number") {
    set.maxTeamMembers = input.maxTeamMembers;
  } else {
    update.$unset = { maxTeamMembers: "" };
  }
  const res = await Plan.updateOne({ _id: id }, update);
  return res.matchedCount > 0;
}

export async function deletePlan(id: string) {
  await connectToDatabase();
  const res = await Plan.deleteOne({ _id: id });
  return res.deletedCount > 0;
}
