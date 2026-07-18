import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A nutrition plan delivered as IMAGES the coach photographs/uploads, instead
 * of structured meals.
 *
 * This is a SEPARATE, PARALLEL system to `NutritionPlan` — deliberately its own
 * model so the structured plan (meals, macro totals, MealLog adherence, the
 * builder and the generator) keeps working untouched. There is no `meals` and
 * no `totals` here, so none of that machinery can be accidentally reused.
 *
 * Which of the two a client sees is decided by recency: the newest `active`
 * document across both models wins — the same rule the structured system
 * already used (assigning never archived the previous plan; the newest one is
 * simply the one served).
 */
export interface INutritionImagePlanImage {
  url: string;
  publicId?: string;
  order: number;
}

export interface INutritionImagePlan {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  nameAr: string;
  nameEn: string;
  images: INutritionImagePlanImage[];
  /** Optional free-text note the coach adds alongside the images. */
  note?: string;
  status: "active" | "archived";
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<INutritionImagePlanImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const NutritionImagePlanSchema = new Schema<INutritionImagePlan>(
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
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    images: { type: [ImageSchema], default: [] },
    note: { type: String, trim: true },
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

NutritionImagePlanSchema.index({ client: 1, status: 1 });
NutritionImagePlanSchema.index({ coach: 1, status: 1 });

export const NutritionImagePlan: Model<INutritionImagePlan> =
  (models.NutritionImagePlan as Model<INutritionImagePlan>) ||
  model<INutritionImagePlan>("NutritionImagePlan", NutritionImagePlanSchema);

export default NutritionImagePlan;
