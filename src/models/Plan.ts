import { Schema, model, models, type Model, type Types } from "mongoose";
import { PLAN_TIERS, type PlanTier } from "@/lib/constants";

export interface IPlanFeatures {
  branding: boolean;
  aiCoach: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  pdfBranding: boolean;
  advancedAnalytics: boolean;
}

export interface IPlan {
  _id: Types.ObjectId;
  tier: PlanTier;
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
  price: number; // in EGP
  /** Billing period in whole calendar months (1 = monthly, 3 = quarterly). Subscription end dates are computed via addMonths(startDate, durationMonths) — never as a raw day count. */
  durationMonths: number;
  maxClients: number;
  features: { ar: string; en: string }[];
  /** Feature flags that unlock gated capabilities for subscribers of this plan. */
  planFeatures: IPlanFeatures;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocalizedString = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

const PlanFeaturesSchema = new Schema<IPlanFeatures>(
  {
    branding: { type: Boolean, default: false },
    aiCoach: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    pdfBranding: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
  },
  { _id: false },
);

const PlanSchema = new Schema<IPlan>(
  {
    tier: { type: String, enum: PLAN_TIERS, required: true },
    name: { type: LocalizedString, required: true },
    description: { type: LocalizedString },
    price: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },
    maxClients: { type: Number, required: true, min: 0 },
    features: { type: [LocalizedString], default: [] },
    planFeatures: {
      type: PlanFeaturesSchema,
      default: () => ({ branding: false, aiCoach: false, customDomain: false, apiAccess: false, pdfBranding: false, advancedAnalytics: false }),
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan: Model<IPlan> =
  (models.Plan as Model<IPlan>) || model<IPlan>("Plan", PlanSchema);

export default Plan;
