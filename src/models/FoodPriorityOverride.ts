import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  FOOD_PRIORITIES,
  MEAL_TYPES,
  type FoodPriority,
  type MealType,
} from "@/lib/constants";

/**
 * A coach's PERSONAL preferences for a food, used only by that coach's
 * nutrition generator. It never mutates the shared system food — instead it
 * overrides the food's defaults for this coach alone. One row per (coach, food).
 *
 * Coaches edit their own custom foods directly on the Food document; this table
 * exists so a coach can also re-prioritise or re-slot SYSTEM foods for their own
 * account without affecting the global library or other coaches.
 *
 * `priority` and `meals` are independent, and both are optional: a coach who
 * only re-slots a food's meals must not have its stars touched. Absent means
 * "not overridden — use the food's own value", which is why neither may carry a
 * schema default; a default would silently overwrite the base value on a row
 * created for the other field. The collection name predates `meals`.
 */
export interface IFoodPriorityOverride {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  food: Types.ObjectId;
  /** Absent = this coach hasn't overridden the food's priority. */
  priority?: FoodPriority;
  /** Absent = this coach hasn't overridden the food's meals. */
  meals?: MealType[];
  createdAt: Date;
  updatedAt: Date;
}

const FoodPriorityOverrideSchema = new Schema<IFoodPriorityOverride>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    food: { type: Schema.Types.ObjectId, ref: "Food", required: true, index: true },
    priority: { type: Number, enum: FOOD_PRIORITIES },
    meals: { type: [String], enum: MEAL_TYPES },
  },
  { timestamps: true },
);

// One override per coach per food.
FoodPriorityOverrideSchema.index({ coach: 1, food: 1 }, { unique: true });

export const FoodPriorityOverride: Model<IFoodPriorityOverride> =
  (models.FoodPriorityOverride as Model<IFoodPriorityOverride>) ||
  model<IFoodPriorityOverride>("FoodPriorityOverride", FoodPriorityOverrideSchema);

export default FoodPriorityOverride;
