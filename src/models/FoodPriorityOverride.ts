import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  FOOD_PRIORITIES,
  DEFAULT_FOOD_PRIORITY,
  type FoodPriority,
} from "@/lib/constants";

/**
 * A coach's PERSONAL priority for a food, used only by that coach's nutrition
 * generator. It never mutates the shared system food — instead it overrides the
 * food's default priority for this coach alone. One row per (coach, food).
 *
 * Coaches edit their own custom foods' priority directly on the Food document;
 * this table exists so a coach can also re-prioritise SYSTEM foods for their own
 * account without affecting the global library or other coaches.
 */
export interface IFoodPriorityOverride {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  food: Types.ObjectId;
  priority: FoodPriority;
  createdAt: Date;
  updatedAt: Date;
}

const FoodPriorityOverrideSchema = new Schema<IFoodPriorityOverride>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    food: { type: Schema.Types.ObjectId, ref: "Food", required: true, index: true },
    priority: {
      type: Number,
      enum: FOOD_PRIORITIES,
      default: DEFAULT_FOOD_PRIORITY,
      required: true,
    },
  },
  { timestamps: true },
);

// One override per coach per food.
FoodPriorityOverrideSchema.index({ coach: 1, food: 1 }, { unique: true });

export const FoodPriorityOverride: Model<IFoodPriorityOverride> =
  (models.FoodPriorityOverride as Model<IFoodPriorityOverride>) ||
  model<IFoodPriorityOverride>("FoodPriorityOverride", FoodPriorityOverrideSchema);

export default FoodPriorityOverride;
