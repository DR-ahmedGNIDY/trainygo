import { Schema, model, models, type Model, type Types } from "mongoose";

/** Audit trail for coach-initiated client password resets. */
export interface IPasswordResetLog {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  coachName: string;
  client: Types.ObjectId;
  clientName: string;
  createdAt: Date;
}

const PasswordResetLogSchema = new Schema<IPasswordResetLog>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coachName: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PasswordResetLog: Model<IPasswordResetLog> =
  (models.PasswordResetLog as Model<IPasswordResetLog>) ||
  model<IPasswordResetLog>("PasswordResetLog", PasswordResetLogSchema);

export default PasswordResetLog;
