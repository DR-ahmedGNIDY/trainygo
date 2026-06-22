import { Schema, model, models, type Model, type Types } from "mongoose";
import { PLAN_TIERS, type PlanTier } from "@/lib/constants";

export interface IPlan {
  _id: Types.ObjectId;
  tier: PlanTier;
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
  price: number; // in EGP
  durationDays: number;
  maxClients: number;
  features: { ar: string; en: string }[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocalizedString = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

const PlanSchema = new Schema<IPlan>(
  {
    tier: { type: String, enum: PLAN_TIERS, required: true },
    name: { type: LocalizedString, required: true },
    description: { type: LocalizedString },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    maxClients: { type: Number, required: true, min: 0 },
    features: { type: [LocalizedString], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan: Model<IPlan> =
  (models.Plan as Model<IPlan>) || model<IPlan>("Plan", PlanSchema);

export default Plan;
