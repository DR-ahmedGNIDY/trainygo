import { Schema, model, models, type Model, type Types } from "mongoose";
import { MEAL_TYPES, FOOD_UNITS, type MealType, type FoodUnit } from "@/lib/constants";

/** A single food item within a meal, with snapshotted macros + substitutions. */
export interface INutritionItem {
  food?: Types.ObjectId | null;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unit: FoodUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Alternative foods the client may swap in. */
  substitutes: {
    food?: Types.ObjectId | null;
    nameAr: string;
    nameEn: string;
    quantity: number;
    unit: FoodUnit;
  }[];
}

export interface IMeal {
  type: MealType;
  /**
   * Coach-chosen display name ("Meal 1", "Pre Workout", ...). Optional: when
   * absent — as on every template written before this existed — every render
   * surface falls back to the localized label for `type`. Read it through
   * `mealDisplayName()` so that fallback is never forgotten.
   */
  name?: { ar?: string; en?: string };
  items: INutritionItem[];
  notes?: string;
}

export interface INutritionTemplate {
  _id: Types.ObjectId;
  nameAr: string;
  nameEn: string;
  description?: { ar?: string; en?: string };
  targetCalories?: number;
  meals: IMeal[];
  /**
   * Bumped on every content edit. A duplicate starts back at 1: it is an
   * independent template, not a continuation of the source's history.
   */
  version: number;
  /** Super admin pins important templates to the top of every coach's list. */
  featured: boolean;
  /** True when a super admin authored it: global to all coaches, and official. */
  isSystemTemplate: boolean;
  createdByCoach?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const Localized = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

const SubstituteSchema = new Schema(
  {
    food: { type: Schema.Types.ObjectId, ref: "Food", default: null },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    quantity: { type: Number, default: 100 },
    unit: { type: String, enum: FOOD_UNITS, default: "100g" },
  },
  { _id: false },
);

export const NutritionItemSchema = new Schema<INutritionItem>(
  {
    food: { type: Schema.Types.ObjectId, ref: "Food", default: null },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    quantity: { type: Number, default: 100, min: 0 },
    unit: { type: String, enum: FOOD_UNITS, default: "100g" },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    substitutes: { type: [SubstituteSchema], default: [] },
  },
  { _id: false },
);

export const MealSchema = new Schema<IMeal>(
  {
    type: { type: String, enum: MEAL_TYPES, required: true },
    name: { type: Localized },
    items: { type: [NutritionItemSchema], default: [] },
    notes: { type: String },
  },
  { _id: false },
);

const NutritionTemplateSchema = new Schema<INutritionTemplate>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    description: { type: Localized },
    targetCalories: { type: Number, min: 0 },
    meals: { type: [MealSchema], default: [] },
    // Existing documents predate these two fields and so read back as
    // undefined; the services default them (version -> 1, featured -> false)
    // rather than requiring a migration.
    version: { type: Number, default: 1, min: 1 },
    featured: { type: Boolean, default: false, index: true },
    isSystemTemplate: { type: Boolean, default: false, index: true },
    createdByCoach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Matches the list access path: filter by (own OR global), then sort
// featured -> official -> newest.
NutritionTemplateSchema.index({ featured: -1, isSystemTemplate: -1, createdAt: -1 });

export const NutritionTemplate: Model<INutritionTemplate> =
  (models.NutritionTemplate as Model<INutritionTemplate>) ||
  model<INutritionTemplate>("NutritionTemplate", NutritionTemplateSchema);

export default NutritionTemplate;
