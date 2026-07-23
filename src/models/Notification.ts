import { Schema, model, models, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";

/**
 * Structured, platform-neutral navigation target for a notification.
 *
 * The web-facing `link` is DERIVED from this (see resolveLink); native apps
 * (Android/iOS) read `route` + `entityId` and build their own route. Storing
 * the intent — not just a web path — means the same notification opens the
 * right screen on every platform without ever changing the record.
 */
export interface INotificationTarget {
  route: string;
  entityType?: string;
  entityId?: string;
  params?: Record<string, string>;
}

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  /** In-app deep link, e.g. /coach/clients/123. Derived from `target` when set. */
  link?: string;
  /** Structured navigation target (cross-platform). */
  target?: INotificationTarget;
  /**
   * Template provenance. The rendered text above is SNAPSHOTTED at creation, so
   * old notifications never change when a template is edited; these fields keep
   * the trail for analytics and future re-rendering under a specific version.
   */
  templateKey?: string;
  templateVersion?: number;
  /**
   * Idempotency fence: unique per recipient. Set only when the emitter supplies
   * an idempotency key, so a retried/duplicated operation resolves to the same
   * record instead of creating a second notification.
   */
  dedupeKey?: string;
  read: boolean;
  /** Set when the user opens the notification (from any channel). */
  clickedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String, required: true },
    bodyAr: { type: String },
    bodyEn: { type: String },
    link: { type: String },
    target: {
      type: new Schema<INotificationTarget>(
        {
          route: { type: String, required: true },
          entityType: { type: String },
          entityId: { type: String },
          params: { type: Map, of: String },
        },
        { _id: false },
      ),
      required: false,
    },
    templateKey: { type: String },
    templateVersion: { type: Number },
    dedupeKey: { type: String },
    read: { type: Boolean, default: false, index: true },
    clickedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
// Idempotency fence — sparse so notifications without a dedupeKey are unaffected.
NotificationSchema.index(
  { recipient: 1, dedupeKey: 1 },
  { unique: true, sparse: true },
);

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);

export default Notification;
