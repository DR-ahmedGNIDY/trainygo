import { Schema, model, models, type Model, type Types } from "mongoose";
import { MEAL_TYPES, type MealType } from "@/lib/constants";

/**
 * Records a client marking one meal of their nutrition plan as eaten, on a
 * given calendar day. One log per (plan, mealIndex, day) — re-marking the
 * same meal the same day is idempotent (upsert), and a new day starts fresh,
 * which is what makes day-over-day adherence % meaningful.
 */
export interface IMealLog {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  plan: Types.ObjectId;
  mealIndex: number;
  mealType: MealType;
  /** Macro snapshot of the meal at the time it was logged. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Midnight of the day this log counts toward (for grouping/uniqueness). */
  day: Date;
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MealLogSchema = new Schema<IMealLog>(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "NutritionPlan", required: true, index: true },
    mealIndex: { type: Number, required: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    day: { type: Date, required: true },
    loggedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

MealLogSchema.index({ plan: 1, mealIndex: 1, day: 1 }, { unique: true });
MealLogSchema.index({ coach: 1, day: 1 });

export const MealLog: Model<IMealLog> =
  (models.MealLog as Model<IMealLog>) || model<IMealLog>("MealLog", MealLogSchema);

export default MealLog;
