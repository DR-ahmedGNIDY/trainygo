import { Schema, model, models, type Model, type Types } from "mongoose";

export const CHECKIN_FIELD_TYPES = [
  "text",
  "number",
  "scale", // 1-10
  "boolean",
  "select",
] as const;
export type CheckinFieldType = (typeof CHECKIN_FIELD_TYPES)[number];

export interface ICheckinField {
  key: string;
  labelAr: string;
  labelEn: string;
  type: CheckinFieldType;
  required: boolean;
  options?: string[];
  order: number;
}

export interface ICheckinForm {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  titleAr: string;
  titleEn: string;
  description?: string;
  fields: ICheckinField[];
  /** Empty = available to all of the coach's clients. */
  assignedClients: Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckinResponse {
  _id: Types.ObjectId;
  form: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  answers: { key: string; value: string }[];
  reviewed: boolean;
  coachFeedback?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckinFieldSchema = new Schema<ICheckinField>(
  {
    key: { type: String, required: true },
    labelAr: { type: String, required: true },
    labelEn: { type: String, required: true },
    type: { type: String, enum: CHECKIN_FIELD_TYPES, default: "text" },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const CheckinFormSchema = new Schema<ICheckinForm>(
  {
    coach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    titleAr: { type: String, required: true },
    titleEn: { type: String, required: true },
    description: { type: String },
    fields: { type: [CheckinFieldSchema], default: [] },
    assignedClients: [{ type: Schema.Types.ObjectId, ref: "User" }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CheckinResponseSchema = new Schema<ICheckinResponse>(
  {
    form: {
      type: Schema.Types.ObjectId,
      ref: "CheckinForm",
      required: true,
      index: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: {
      type: [
        new Schema(
          { key: { type: String }, value: { type: String } },
          { _id: false },
        ),
      ],
      default: [],
    },
    reviewed: { type: Boolean, default: false, index: true },
    coachFeedback: { type: String },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

CheckinResponseSchema.index({ coach: 1, reviewed: 1, submittedAt: -1 });

export const CheckinForm: Model<ICheckinForm> =
  (models.CheckinForm as Model<ICheckinForm>) ||
  model<ICheckinForm>("CheckinForm", CheckinFormSchema);

export const CheckinResponse: Model<ICheckinResponse> =
  (models.CheckinResponse as Model<ICheckinResponse>) ||
  model<ICheckinResponse>("CheckinResponse", CheckinResponseSchema);
