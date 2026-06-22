import { Schema, model, models, type Model, type Types } from "mongoose";
import { EXERCISE_CATEGORIES, type ExerciseCategory } from "@/lib/constants";

export interface IExercise {
  _id: Types.ObjectId;
  nameAr: string;
  nameEn: string;
  category: ExerciseCategory;
  targetMuscles: string[];
  description?: { ar?: string; en?: string };
  instructions?: { ar?: string; en?: string };
  commonMistakes?: { ar?: string; en?: string };
  coachTips?: { ar?: string; en?: string };
  gifUrl?: string;
  gifPublicId?: string;
  youtubeUrl?: string;
  isSystemExercise: boolean;
  createdByCoach?: Types.ObjectId | null;
  /** Provenance for imported system exercises (ExerciseDB / WGER). */
  importSource?: string;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Localized = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

const ExerciseSchema = new Schema<IExercise>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: EXERCISE_CATEGORIES,
      required: true,
      index: true,
    },
    targetMuscles: { type: [String], default: [] },
    description: { type: Localized },
    instructions: { type: Localized },
    commonMistakes: { type: Localized },
    coachTips: { type: Localized },
    gifUrl: { type: String },
    gifPublicId: { type: String },
    youtubeUrl: { type: String },
    isSystemExercise: { type: Boolean, default: false, index: true },
    createdByCoach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    importSource: { type: String },
    externalId: { type: String },
  },
  { timestamps: true },
);

// Idempotent imports: dedup by (source, externalId)
ExerciseSchema.index(
  { importSource: 1, externalId: 1 },
  { unique: true, sparse: true },
);

// Text search across both languages
ExerciseSchema.index({ nameAr: "text", nameEn: "text" });
// Visibility: system exercises + coach's own custom ones
ExerciseSchema.index({ isSystemExercise: 1, createdByCoach: 1, category: 1 });

export const Exercise: Model<IExercise> =
  (models.Exercise as Model<IExercise>) ||
  model<IExercise>("Exercise", ExerciseSchema);

export default Exercise;
