import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  PAYMENT_METHODS,
  SUBSCRIPTION_STATUSES,
  type PaymentMethod,
  type SubscriptionStatus,
} from "@/lib/constants";

/**
 * A coach subscription record. Payment is OFFLINE only (Vodafone Cash / InstaPay)
 * and is activated manually by a Super Admin.
 */
export interface ISubscription {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  plan: Types.ObjectId;
  status: SubscriptionStatus;
  startDate?: Date;
  endDate?: Date;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string; // transaction id / phone used
  notes?: string;
  activatedBy?: Types.ObjectId; // super admin who activated
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    coach: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "pending",
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS },
    paymentReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    activatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    activatedAt: { type: Date },
  },
  { timestamps: true },
);

export const Subscription: Model<ISubscription> =
  (models.Subscription as Model<ISubscription>) ||
  model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;
