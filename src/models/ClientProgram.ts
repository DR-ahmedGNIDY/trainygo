import { Schema, model, models, type Model, type Types } from "mongoose";
import { CLIENT_GOALS, type ClientGoal } from "@/lib/constants";
import {
  WorkoutWeekSchema,
  type IWorkoutWeek,
} from "@/models/WorkoutTemplate";

/**
 * A workout program assigned to a client. This is an INDEPENDENT COPY of a
 * template (or built from scratch). Editing the source template later must NOT
 * affect assigned client programs, so the full week/day/exercise structure is
 * embedded here rather than referenced.
 */
export interface IClientProgram {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  coach: Types.ObjectId;
  sourceTemplate?: Types.ObjectId | null;
  nameAr: string;
  nameEn: string;
  description?: { ar?: string; en?: string };
  goal?: ClientGoal;
  weeks: IWorkoutWeek[];
  status: "active" | "archived";
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Localized = new Schema(
  { ar: { type: String, default: "" }, en: { type: String, default: "" } },
  { _id: false },
);

const ClientProgramSchema = new Schema<IClientProgram>(
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
    sourceTemplate: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutTemplate",
      default: null,
    },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    description: { type: Localized },
    goal: { type: String, enum: CLIENT_GOALS },
    weeks: { type: [WorkoutWeekSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    startDate: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

ClientProgramSchema.index({ client: 1, status: 1 });

export const ClientProgram: Model<IClientProgram> =
  (models.ClientProgram as Model<IClientProgram>) ||
  model<IClientProgram>("ClientProgram", ClientProgramSchema);

export default ClientProgram;
