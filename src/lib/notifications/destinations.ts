import { Device } from "@/models/Device";
import type { NotificationChannel, DeviceTransport } from "@/lib/constants";
import type { DeliveryTarget } from "./channels/types";

/**
 * Resolve where a channel should deliver to for one recipient.
 *
 * Device knowledge lives HERE (in the Dispatcher layer), not in adapters: this
 * queries the recipient's live devices and hands each adapter a ready
 * `DeliveryTarget`. Address-based channels (email/sms/whatsapp) will resolve
 * from the user profile via the same function shape when added.
 *
 * One indexed query per channel → no N+1: the caller loops channels, and each
 * call is a single `find` over the `(user, disabledAt)` index.
 */

/** Which device transports feed which channel. */
const CHANNEL_TRANSPORTS: Partial<Record<NotificationChannel, DeviceTransport[]>> = {
  web_push: ["webpush"],
  // fcm: ["fcm"], apns: ["apns"] — added with their adapters.
};

export async function resolveDestinations(
  recipient: string,
  channel: NotificationChannel,
): Promise<DeliveryTarget[]> {
  const transports = CHANNEL_TRANSPORTS[channel];
  if (!transports) return []; // address-based / unconfigured channels: none yet.

  const devices = await Device.find({
    user: recipient,
    disabledAt: null,
    transport: { $in: transports },
  }).lean();

  return devices.map((d) => ({
    userId: recipient,
    channel,
    deviceId: String(d._id),
    credentials: d.credentials,
    locale: d.locale,
  }));
}
