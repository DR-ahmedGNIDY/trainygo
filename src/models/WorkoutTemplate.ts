import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CLIENT_GOALS,
  TEMPLATE_CREATOR_TYPES,
  type ClientGoal,
  type TemplateCreatorType,
} from "@/lib/constants";
import { syncCreatorType } from "./template-creator";

/**
 * One exercise inside a workout day. The exercise name is denormalized
 * (snapshotted) so that when a template is assigned to a client the program
 * remains independent of later edits to the source exercise/template.
 */
export interface IWorkoutExerciseEntry {
  exercise?: Types.ObjectId | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string; // e.g. "8-12" or "AMRAP"
  restSeconds?: number;
  tempo?: string;
  notes?: string;
  order: number;
}

export interface IWorkoutDay {
  name: { ar: string; en: string };
  dayNumber: number;
  exercises: IWorkoutExerciseEntry[];
  notes?: string;
}

export interface IWorkoutWeek {
  weekNumber: number;
  name?: { ar?: string; en?: string };
  days: IWorkoutDay[];
}

export interface IWorkoutTemplate {
  _id: Types.ObjectId;
  nameAr: string;
  nameEn: string;
  description?: { ar?: string; en?: string };
  goal?: ClientGoal;
  weeks: IWorkoutWeek[];
  /**
   * Authoring source. Prefer this over `isSystemTemplate` in new code — it is
   * the field that can grow to premium/marketplace/ai_generated later.
   */
  createdByType: TemplateCreatorType;
  /** @deprecated Kept in sync with `createdByType` for backward compatibility. */
  isSystemTemplate: boolean;
  createdByCoach?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const Localized = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

export const WorkoutExerciseEntrySchema = new Schema<IWorkoutExerciseEntry>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: "Exercise", default: null },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    sets: { type: Number, default: 3, min: 0 },
    reps: { type: String, default: "8-12" },
    restSeconds: { type: Number, default: 60 },
    tempo: { type: String },
    notes: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

export const WorkoutDaySchema = new Schema<IWorkoutDay>(
  {
    name: { type: Localized, required: true },
    dayNumber: { type: Number, required: true },
    exercises: { type: [WorkoutExerciseEntrySchema], default: [] },
    notes: { type: String },
  },
  { _id: false },
);

export const WorkoutWeekSchema = new Schema<IWorkoutWeek>(
  {
    weekNumber: { type: Number, required: true },
    name: { type: Localized },
    days: { type: [WorkoutDaySchema], default: [] },
  },
  { _id: false },
);

const WorkoutTemplateSchema = new Schema<IWorkoutTemplate>(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    description: { type: Localized },
    goal: { type: String, enum: CLIENT_GOALS },
    weeks: { type: [WorkoutWeekSchema], default: [] },
    createdByType: {
      type: String,
      enum: TEMPLATE_CREATOR_TYPES,
      default: "coach",
      index: true,
    },
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

// Coach template lists filter on (createdByCoach OR global) and sort globals
// first, so index that access path rather than each field alone.
WorkoutTemplateSchema.index({ createdByType: 1, createdByCoach: 1, createdAt: -1 });

syncCreatorType(WorkoutTemplateSchema);

export const WorkoutTemplate: Model<IWorkoutTemplate> =
  (models.WorkoutTemplate as Model<IWorkoutTemplate>) ||
  model<IWorkoutTemplate>("WorkoutTemplate", WorkoutTemplateSchema);

export default WorkoutTemplate;
