import { Schema, model, models, type Model, type Types } from "mongoose";
import { MealSchema, type IMeal } from "@/models/NutritionTemplate";

/**
 * A nutrition plan assigned to a client — an INDEPENDENT COPY of a template
 * (or built from scratch). Macro totals are stored denormalized for fast reads
 * and recomputed whenever meals change.
 */
export interface INutritionPlan {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  sourceTemplate?: Types.ObjectId | null;
  nameAr: string;
  nameEn: string;
  meals: IMeal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  status: "active" | "archived";
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TotalsSchema = new Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
  },
  { _id: false },
);

const NutritionPlanSchema = new Schema<INutritionPlan>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceTemplate: {
      type: Schema.Types.ObjectId,
      ref: "NutritionTemplate",
      default: null,
    },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    meals: { type: [MealSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    startDate: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

NutritionPlanSchema.index({ client: 1, status: 1 });

export const NutritionPlan: Model<INutritionPlan> =
  (models.NutritionPlan as Model<INutritionPlan>) ||
  model<INutritionPlan>("NutritionPlan", NutritionPlanSchema);

export default NutritionPlan;
