import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUSES,
  type NotificationChannel,
  type DeliveryStatus,
} from "@/lib/constants";

/**
 * One delivery attempt of one Notification over one channel to one destination.
 *
 * Channel-agnostic AND provider-agnostic by design:
 *  - `channel` is a generic enum (web_push | fcm | email | sms | whatsapp | …).
 *  - the destination is a reference (`deviceId` or `address`), never raw creds.
 *  - `providerMessageId` + `meta` absorb anything provider-specific (web-push,
 *    Firebase, OneSignal, AWS SNS, Azure…). NOTHING outside the adapter reads
 *    `meta`, so swapping providers never touches this model or any business
 *    logic — only the adapter changes.
 *
 * The Notification record carries user-facing state (read/clickedAt); this
 * carries transport lifecycle, and is the substrate for analytics
 * (sent/delivered/failed/click rates) without any extra tables.
 */
export interface INotificationDelivery {
  _id: Types.ObjectId;
  notification: Types.ObjectId;
  user: Types.ObjectId;
  channel: NotificationChannel;
  /** Destination reference — device for push, address for email/sms/whatsapp. */
  deviceId?: Types.ObjectId | null;
  address?: string | null;
  locale?: string;
  status: DeliveryStatus;
  attempts: number;
  error?: string | null;
  /** Opaque id returned by whatever provider sent it. Provider-neutral. */
  providerMessageId?: string | null;
  /** Free-form provider extras. Only the adapter ever reads/writes this. */
  meta?: Record<string, unknown>;
  statusUpdatedAt: Date;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  clickedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationDeliverySchema = new Schema<INotificationDelivery>(
  {
    notification: { type: Schema.Types.ObjectId, ref: "Notification", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device", default: null },
    address: { type: String, default: null },
    locale: { type: String },
    status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed },
    statusUpdatedAt: { type: Date, default: () => new Date() },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Duplicate-send guard: one delivery per (notification, channel, device).
NotificationDeliverySchema.index(
  { notification: 1, channel: 1, deviceId: 1 },
  { unique: true, sparse: true },
);
// Analytics: scan a user's deliveries by status over time.
NotificationDeliverySchema.index({ user: 1, status: 1, createdAt: -1 });

export const NotificationDelivery: Model<INotificationDelivery> =
  (models.NotificationDelivery as Model<INotificationDelivery>) ||
  model<INotificationDelivery>("NotificationDelivery", NotificationDeliverySchema);

export default NotificationDelivery;
