import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * One immutable record per freeze period of a client's subscription. Written
 * on freeze (with `resumeDate` null) and completed on resume. Previous records
 * are NEVER overwritten — a client may be frozen and resumed many times, and
 * the full timeline is preserved for reporting and the client-profile history.
 */
export interface ISubscriptionFreezeHistory {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  /** The coach/team member who performed the freeze (audit). */
  frozenBy?: Types.ObjectId;
  freezeDate: Date;
  /** Null while still frozen; set when the coach resumes the subscription. */
  resumeDate?: Date | null;
  /** Days left on the subscription at the moment of freezing — preserved verbatim. */
  remainingDays: number;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionFreezeHistorySchema = new Schema<ISubscriptionFreezeHistory>(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    frozenBy: { type: Schema.Types.ObjectId, ref: "User" },
    freezeDate: { type: Date, required: true, default: Date.now },
    resumeDate: { type: Date, default: null },
    remainingDays: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

// A client has at most one open (not-yet-resumed) freeze at a time.
SubscriptionFreezeHistorySchema.index({ client: 1, resumeDate: 1 });

export const SubscriptionFreezeHistory: Model<ISubscriptionFreezeHistory> =
  (models.SubscriptionFreezeHistory as Model<ISubscriptionFreezeHistory>) ||
  model<ISubscriptionFreezeHistory>("SubscriptionFreezeHistory", SubscriptionFreezeHistorySchema);

export default SubscriptionFreezeHistory;
