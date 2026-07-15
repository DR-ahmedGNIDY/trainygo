import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  FOOD_CATEGORIES,
  FOOD_PRIORITIES,
  FOOD_UNITS,
  DEFAULT_FOOD_PRIORITY,
  type FoodCategory,
  type FoodPriority,
  type FoodUnit,
} from "@/lib/constants";

/**
 * Food item in the nutrition library. Macros are stored per the item's
 * base unit (default 100g). Image is optional — not every food has one.
 */
export interface IFood {
  _id: Types.ObjectId;
  nameAr: string;
  nameEn: string;
  category: FoodCategory;
  unit: FoodUnit;
  /** grams represented by one base unit (e.g. piece = 50g) — used for scaling */
  unitGrams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Coach preference weight for the generator's rule engine (1–5, 5 = highest). */
  priority: FoodPriority;
  imageUrl?: string;
  imagePublicId?: string;
  isSystemFood: boolean;
  createdByCoach?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const FoodSchema = new Schema<IFood>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: FOOD_CATEGORIES,
      required: true,
      index: true,
    },
    unit: { type: String, enum: FOOD_UNITS, default: "100g" },
    unitGrams: { type: Number, default: 100 },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
    priority: {
      type: Number,
      enum: FOOD_PRIORITIES,
      default: DEFAULT_FOOD_PRIORITY,
      index: true,
    },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    isSystemFood: { type: Boolean, default: true, index: true },
    createdByCoach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

FoodSchema.index({ nameAr: "text", nameEn: "text" });
FoodSchema.index({ isSystemFood: 1, createdByCoach: 1, category: 1 });

export const Food: Model<IFood> =
  (models.Food as Model<IFood>) || model<IFood>("Food", FoodSchema);

export default Food;
