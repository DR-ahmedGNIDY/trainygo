import { Schema, model, models, type Model, type Types } from "mongoose";

/** Body measurements + progress photos submitted by a client over time. */
export interface IProgressEntry {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  date: Date;
  weight?: number; // kg
  chest?: number; // cm
  waist?: number;
  arms?: number;
  thighs?: number;
  bodyFat?: number; // %
  photos: {
    front?: { url: string; publicId?: string };
    side?: { url: string; publicId?: string };
    back?: { url: string; publicId?: string };
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema(
  { url: { type: String }, publicId: { type: String } },
  { _id: false },
);

const ProgressEntrySchema = new Schema<IProgressEntry>(
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
    date: { type: Date, default: () => new Date(), index: true },
    weight: { type: Number, min: 0 },
    chest: { type: Number, min: 0 },
    waist: { type: Number, min: 0 },
    arms: { type: Number, min: 0 },
    thighs: { type: Number, min: 0 },
    bodyFat: { type: Number, min: 0, max: 100 },
    photos: {
      front: { type: PhotoSchema },
      side: { type: PhotoSchema },
      back: { type: PhotoSchema },
    },
    notes: { type: String },
  },
  { timestamps: true },
);

ProgressEntrySchema.index({ client: 1, date: -1 });

export const ProgressEntry: Model<IProgressEntry> =
  (models.ProgressEntry as Model<IProgressEntry>) ||
  model<IProgressEntry>("ProgressEntry", ProgressEntrySchema);

export default ProgressEntry;
