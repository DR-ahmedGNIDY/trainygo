import { Schema, model, models, type Model, type Types } from "mongoose";

/** A single logged set inside a finished workout session report. */
export interface IReportSet {
  setNumber: number;
  weight: number;
  reps: number;
}

/** One exercise's outcome within a completed workout session. */
export interface IReportExercise {
  exercise?: Types.ObjectId | null;
  nameAr: string;
  nameEn: string;
  targetSets: number;
  targetReps: string;
  sets: IReportSet[];
  /** Exercise was pushed to the end of the session at least once. */
  wasDeferred: boolean;
}

/**
 * A full client workout session, from "Start Now" to "Finish & send to
 * coach". Summarizes every exercise performed so the coach can review it in
 * one place, independent of the per-exercise WorkoutLog history used for
 * personal-record tracking.
 */
export interface IWorkoutReport {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  program?: Types.ObjectId | null;
  weekNumber?: number;
  dayNumber?: number;
  dayNameAr: string;
  dayNameEn: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  exercises: IReportExercise[];
  completedCount: number;
  deferredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSetSchema = new Schema<IReportSet>(
  {
    setNumber: { type: Number, required: true },
    weight: { type: Number, default: 0, min: 0 },
    reps: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const ReportExerciseSchema = new Schema<IReportExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: "Exercise", default: null },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    targetSets: { type: Number, default: 0 },
    targetReps: { type: String, default: "" },
    sets: { type: [ReportSetSchema], default: [] },
    wasDeferred: { type: Boolean, default: false },
  },
  { _id: false },
);

const WorkoutReportSchema = new Schema<IWorkoutReport>(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    program: { type: Schema.Types.ObjectId, ref: "ClientProgram", default: null },
    weekNumber: { type: Number },
    dayNumber: { type: Number },
    dayNameAr: { type: String, default: "" },
    dayNameEn: { type: String, default: "" },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationSeconds: { type: Number, default: 0 },
    exercises: { type: [ReportExerciseSchema], default: [] },
    completedCount: { type: Number, default: 0 },
    deferredCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

WorkoutReportSchema.index({ coach: 1, createdAt: -1 });
WorkoutReportSchema.index({ client: 1, createdAt: -1 });

export const WorkoutReport: Model<IWorkoutReport> =
  (models.WorkoutReport as Model<IWorkoutReport>) ||
  model<IWorkoutReport>("WorkoutReport", WorkoutReportSchema);

export default WorkoutReport;
