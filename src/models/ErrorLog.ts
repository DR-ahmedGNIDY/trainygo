import { Schema, model, models, type Model, type Types } from "mongoose";

/** Persistent record of a server-side error, written by lib/logging/error-log.ts. */
export const ERROR_LOG_TYPES = [
  "SERVER_ERROR",
  "ASSIGN_TEMPLATE_ERROR",
  "COPY_PROGRAM_ERROR",
  "AUTH_ERROR",
  "DATABASE_ERROR",
  "SUBSCRIPTION_ERROR",
  "UPLOAD_ERROR",
  "ADMIN_RESET_PLANS",
  "ADMIN_REPAIR_PLAN_DURATION",
  "UNKNOWN",
] as const;
export type ErrorLogType = (typeof ERROR_LOG_TYPES)[number];

export const ERROR_LOG_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type ErrorLogSeverity = (typeof ERROR_LOG_SEVERITIES)[number];

export interface IErrorLog {
  _id: Types.ObjectId;
  type: ErrorLogType;
  severity: ErrorLogSeverity;
  message: string;
  stack?: string;
  code?: string;
  coachId?: Types.ObjectId;
  userId?: Types.ObjectId;
  email?: string;
  route?: string;
  action?: string;
  context?: Record<string, unknown>;
  environment: "production" | "staging" | "development";
  version?: string;
  browser?: string;
  device?: string;
  ipAddress?: string;
  fingerprint: string;
  /** How many times this fingerprint has occurred (1 on first write, incremented on each repeat). */
  count: number;
  /** Timestamp of the most recent occurrence of this fingerprint (createdAt stays the first occurrence). */
  lastOccurredAt: Date;
  resolved: boolean;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    type: { type: String, enum: ERROR_LOG_TYPES, default: "UNKNOWN", index: true },
    severity: { type: String, enum: ERROR_LOG_SEVERITIES, default: "error", index: true },
    message: { type: String, required: true },
    stack: { type: String },
    code: { type: String },
    coachId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String },
    route: { type: String },
    action: { type: String },
    context: { type: Schema.Types.Mixed },
    environment: {
      type: String,
      enum: ["production", "staging", "development"],
      default: "development",
    },
    version: { type: String },
    browser: { type: String },
    device: { type: String },
    ipAddress: { type: String },
    fingerprint: { type: String, unique: true },
    count: { type: Number, default: 1 },
    lastOccurredAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

ErrorLogSchema.index({ createdAt: -1 });

export const ErrorLog: Model<IErrorLog> =
  (models.ErrorLog as Model<IErrorLog>) || model<IErrorLog>("ErrorLog", ErrorLogSchema);

export default ErrorLog;
