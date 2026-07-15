import { Schema, model, models, type Model, type Types } from "mongoose";
import { MealSchema, type IMeal } from "./NutritionTemplate";
import { GENERATOR_GOALS, type GeneratorGoal } from "@/lib/constants";

/**
 * A single run of the nutrition generator, kept as history so a coach can
 * reopen a previously generated plan. Only the last 20 per coach are retained
 * (older ones are pruned on each new generation). This is throwaway working
 * data — saving a plan as a real template creates a separate NutritionTemplate.
 */
export interface INutritionGeneration {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  calories: number;
  goal: GeneratorGoal;
  mealsPerDay: number;
  ratio: { protein: number; carbs: number; fat: number };
  seed: number;
  meals: IMeal[];
  summary: { calories: number; protein: number; carbs: number; fat: number };
  withinTolerance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NutritionGenerationSchema = new Schema<INutritionGeneration>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    calories: { type: Number, required: true },
    goal: { type: String, enum: GENERATOR_GOALS, required: true },
    mealsPerDay: { type: Number, required: true },
    ratio: {
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    seed: { type: Number, default: 0 },
    meals: { type: [MealSchema], default: [] },
    summary: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    withinTolerance: { type: Boolean, default: true },
  },
  { timestamps: true },
);

NutritionGenerationSchema.index({ coach: 1, createdAt: -1 });

export const NutritionGeneration: Model<INutritionGeneration> =
  (models.NutritionGeneration as Model<INutritionGeneration>) ||
  model<INutritionGeneration>("NutritionGeneration", NutritionGenerationSchema);

export default NutritionGeneration;
