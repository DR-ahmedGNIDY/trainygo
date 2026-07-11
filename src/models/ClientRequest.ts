import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  type RequestType,
  type RequestStatus,
} from "@/lib/constants";

/**
 * Type-specific data for an exercise-change request. Kept inside the generic
 * `payload` sub-document so the top-level ClientRequest schema stays request-
 * type agnostic — a future request type just defines its own payload shape.
 *
 * `weekNumber`/`dayNumber` locate the exercise inside the assigned program so
 * the coach's approval replaces exactly the right entry (an exercise can recur
 * across days), and never touches templates or the exercise library.
 */
export interface IExerciseChangePayload {
  weekNumber: number;
  dayNumber: number;
  /** Reference to the source Exercise (may be null for a free-typed program entry). */
  exerciseId?: Types.ObjectId | null;
  /** Snapshotted name of the exercise the client wants replaced. */
  exerciseNameAr: string;
  exerciseNameEn: string;
  /** Filled on approval: the exercise the coach swapped in. */
  replacementExerciseId?: Types.ObjectId | null;
  replacementExerciseNameAr?: string;
  replacementExerciseNameEn?: string;
}

/**
 * A generic client→coach request (the "request/workflow" backbone). Today the
 * only `type` exposed in the UI is `exercise_change`, but every layer keys off
 * `type` + `payload` so new request kinds (nutrition change, meal replacement,
 * pain report, ...) are additive, never architectural.
 */
export interface IClientRequest {
  _id: Types.ObjectId;
  type: RequestType;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  /** The assigned client program this request targets (for exercise_change). */
  program?: Types.ObjectId | null;
  /** Preset quick-reason key (see EXERCISE_CHANGE_QUICK_REASONS). */
  quickReason?: string;
  /** Free-text detail the client wrote. */
  reason?: string;
  status: RequestStatus;
  /** Optional note the coach leaves when approving/rejecting. */
  coachNote?: string;
  /** Type-specific data. Typed as the exercise-change shape today. */
  payload: IExerciseChangePayload;
  resolvedAt?: Date | null;
  /** The user who resolved it (coach or team member acting for the coach). */
  resolvedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseChangePayloadSchema = new Schema<IExerciseChangePayload>(
  {
    weekNumber: { type: Number, required: true },
    dayNumber: { type: Number, required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", default: null },
    exerciseNameAr: { type: String, default: "" },
    exerciseNameEn: { type: String, default: "" },
    replacementExerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", default: null },
    replacementExerciseNameAr: { type: String, default: "" },
    replacementExerciseNameEn: { type: String, default: "" },
  },
  { _id: false },
);

const ClientRequestSchema = new Schema<IClientRequest>(
  {
    type: { type: String, enum: REQUEST_TYPES, required: true, default: "exercise_change", index: true },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    program: { type: Schema.Types.ObjectId, ref: "ClientProgram", default: null },
    quickReason: { type: String },
    reason: { type: String, maxlength: 500 },
    status: { type: String, enum: REQUEST_STATUSES, required: true, default: "pending", index: true },
    coachNote: { type: String, maxlength: 500 },
    payload: { type: ExerciseChangePayloadSchema, required: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Coach dashboard: list a coach's requests newest-first, filterable by type/status.
ClientRequestSchema.index({ coach: 1, type: 1, status: 1, createdAt: -1 });
// Client history + duplicate-pending detection for a given client/program.
ClientRequestSchema.index({ client: 1, type: 1, status: 1 });

export const ClientRequest: Model<IClientRequest> =
  (models.ClientRequest as Model<IClientRequest>) ||
  model<IClientRequest>("ClientRequest", ClientRequestSchema);

export default ClientRequest;
