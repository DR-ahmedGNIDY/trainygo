import { Schema, model, models, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";

/**
 * Per-user notification preferences.
 *
 * Gates EXTERNAL channels only — in-app is the source of truth and is never
 * suppressed, so a user can silence push without ever losing a notification.
 *
 * Layered controls, evaluated by the resolver (lib/notifications/preferences):
 *  - `quietHours`  → time-boxed do-not-disturb (timezone-aware).
 *  - `overrides`   → explicit per-(type, channel) on/off; the finest grain.
 *  - `mutedTypes`  → silence a whole notification type across channels.
 *  - `channels`    → master on/off per channel.
 * Absence means "enabled", so an empty document = default (everything on).
 */
export interface INotificationPreferenceOverride {
  type: NotificationType;
  channel: string;
  enabled: boolean;
}

export interface IQuietHours {
  enabled: boolean;
  /** "HH:MM" 24h, in `timezone`. */
  start: string;
  end: string;
  timezone: string;
}

export interface INotificationPreference {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** Master switch per external channel (e.g. web_push). Absent = enabled. */
  channels: Map<string, boolean>;
  mutedTypes: NotificationType[];
  overrides: INotificationPreferenceOverride[];
  quietHours: IQuietHours;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    channels: { type: Map, of: Boolean, default: {} },
    mutedTypes: { type: [{ type: String, enum: NOTIFICATION_TYPES }], default: [] },
    overrides: {
      type: [
        new Schema<INotificationPreferenceOverride>(
          {
            type: { type: String, enum: NOTIFICATION_TYPES, required: true },
            channel: { type: String, required: true },
            enabled: { type: Boolean, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    quietHours: {
      type: new Schema<IQuietHours>(
        {
          enabled: { type: Boolean, default: false },
          start: { type: String, default: "22:00" },
          end: { type: String, default: "07:00" },
          timezone: { type: String, default: "Africa/Cairo" },
        },
        { _id: false },
      ),
      default: () => ({ enabled: false, start: "22:00", end: "07:00", timezone: "Africa/Cairo" }),
    },
  },
  { timestamps: true },
);

export const NotificationPreference: Model<INotificationPreference> =
  (models.NotificationPreference as Model<INotificationPreference>) ||
  model<INotificationPreference>("NotificationPreference", NotificationPreferenceSchema);

export default NotificationPreference;
