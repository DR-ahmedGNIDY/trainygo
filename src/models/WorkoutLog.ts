import { Schema, model, models, type Model, type Types } from "mongoose";

/** A single logged set: weight + reps performed. */
export interface ILoggedSet {
  setNumber: number;
  weight: number;
  reps: number;
}

/** How this log compares to the client's previous session for the same exercise. */
export const COMPARISON_STATUSES = ["pr", "improved", "steady", "decline", "first_time"] as const;
export type ComparisonStatus = (typeof COMPARISON_STATUSES)[number];

/**
 * A client's workout log for one exercise on one day. History across logs is
 * used to derive personal records and strength progress.
 */
export interface IWorkoutLog {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  program?: Types.ObjectId | null;
  exercise?: Types.ObjectId | null;
  exerciseNameAr: string;
  exerciseNameEn: string;
  weekNumber?: number;
  dayNumber?: number;
  date: Date;
  sets: ILoggedSet[];
  notes?: string;
  completed: boolean;
  /** best estimated 1RM for this session (Epley) — denormalized for PR queries */
  estimatedOneRm: number;
  /** true if this log beat the client's all-time best 1RM for this exercise. */
  isPr: boolean;
  comparisonStatus?: ComparisonStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

const LoggedSetSchema = new Schema<ILoggedSet>(
  {
    setNumber: { type: Number, required: true },
    weight: { type: Number, default: 0, min: 0 },
    reps: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const WorkoutLogSchema = new Schema<IWorkoutLog>(
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
    program: {
      type: Schema.Types.ObjectId,
      ref: "ClientProgram",
      default: null,
    },
    exercise: { type: Schema.Types.ObjectId, ref: "Exercise", default: null },
    exerciseNameAr: { type: String, required: true },
    exerciseNameEn: { type: String, required: true },
    weekNumber: { type: Number },
    dayNumber: { type: Number },
    date: { type: Date, default: () => new Date(), index: true },
    sets: { type: [LoggedSetSchema], default: [] },
    notes: { type: String },
    completed: { type: Boolean, default: true },
    estimatedOneRm: { type: Number, default: 0 },
    isPr: { type: Boolean, default: false },
    comparisonStatus: { type: String, enum: COMPARISON_STATUSES, default: null },
  },
  { timestamps: true },
);

// Exercise history & PR lookups per client
WorkoutLogSchema.index({ client: 1, exercise: 1, date: -1 });

export const WorkoutLog: Model<IWorkoutLog> =
  (models.WorkoutLog as Model<IWorkoutLog>) ||
  model<IWorkoutLog>("WorkoutLog", WorkoutLogSchema);

export default WorkoutLog;
