import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  DEVICE_PLATFORMS,
  DEVICE_TRANSPORTS,
  type DevicePlatform,
  type DeviceTransport,
} from "@/lib/constants";

/**
 * A registered delivery endpoint owned by exactly one user.
 *
 * Polymorphic by design: `transport` selects which push credentials shape lives
 * in `credentials`, so a Web Push subscription, an FCM token, or an APNs token
 * all live in the SAME collection with the SAME schema. Supporting Android/iOS
 * later means writing rows with a different `transport` — never a new model.
 *
 * `user` is the ownership anchor: every write and every send is scoped to it,
 * so a user can neither register a device for someone else nor receive another
 * user's notifications. `credentialHash` is the stable dedupe key that turns
 * re-subscribe (token rotation) into an idempotent upsert instead of a new row.
 */
export interface IDeviceCredentials {
  /** Web Push (VAPID) subscription. */
  endpoint?: string;
  keys?: { p256dh: string; auth: string };
  /** FCM / APNs registration token. */
  token?: string;
}

export interface IDevice {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  platform: DevicePlatform;
  transport: DeviceTransport;
  credentials: IDeviceCredentials;
  /** Stable hash of the credential (endpoint or token) — unique per device. */
  credentialHash: string;
  appVersion?: string;
  deviceName?: string;
  os?: string;
  locale?: string;
  lastSeenAt: Date;
  /** Set when the endpoint is gone (410) or the user unsubscribed. */
  disabledAt?: Date | null;
  /** Consecutive send failures — used to retire flaky endpoints. */
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: DEVICE_PLATFORMS, required: true },
    transport: { type: String, enum: DEVICE_TRANSPORTS, required: true },
    credentials: {
      endpoint: { type: String },
      keys: {
        p256dh: { type: String },
        auth: { type: String },
      },
      token: { type: String },
    },
    credentialHash: { type: String, required: true, unique: true },
    appVersion: { type: String },
    deviceName: { type: String },
    os: { type: String },
    locale: { type: String },
    lastSeenAt: { type: Date, default: () => new Date() },
    disabledAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Fast lookup of a user's live devices when fanning a notification out.
DeviceSchema.index({ user: 1, disabledAt: 1 });

export const Device: Model<IDevice> =
  (models.Device as Model<IDevice>) || model<IDevice>("Device", DeviceSchema);

export default Device;
