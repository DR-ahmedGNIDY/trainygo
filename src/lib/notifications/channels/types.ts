import type { NotificationChannel } from "@/lib/constants";
import type { INotificationTarget } from "@/models/Notification";
import type { IDeviceCredentials } from "@/models/Device";

/**
 * ─── Channel adapter contract ───────────────────────────────────────────────
 *
 * An adapter's ONLY job is to push a ready-made payload onto one transport. It
 * knows nothing about Notification records, locales, templates, titles, bodies,
 * or how the link was chosen — the Dispatcher resolves all of that FIRST and
 * hands the adapter a finished `NotificationPayload` plus a `DeliveryTarget`.
 *
 * This keeps every transport (Web Push, FCM, APNs, Email, SMS, WhatsApp, …)
 * dumb and interchangeable: adding one is writing a `send()` and registering it.
 */

/** Fully-resolved, single-locale content. Built by the Dispatcher, not here. */
export interface NotificationPayload {
  title: string;
  body?: string;
  /** Web/PWA link (already resolved from the structured target). */
  link?: string;
  /** Structured target so native transports build their own route. */
  target?: INotificationTarget;
  /** Arbitrary transport data (e.g. notificationId, type) for click handling. */
  data?: Record<string, string>;
}

/**
 * Where a single payload is going. Polymorphic so it fits BOTH device-based
 * channels (webpush/fcm/apns → `credentials`) and address-based channels
 * (email/sms/whatsapp → `address`) with no shape change.
 */
export interface DeliveryTarget {
  userId: string;
  channel: NotificationChannel;
  /** Device-based transports. */
  deviceId?: string;
  credentials?: IDeviceCredentials;
  /** Address-based transports (email address, phone number, …). */
  address?: string;
  locale?: string;
}

/** What an adapter reports back, so the Dispatcher records lifecycle uniformly. */
export interface DeliveryOutcome {
  status: "sent" | "delivered" | "failed";
  /** Provider's message id (FCM/APNs/email/SMS/WhatsApp all return one). */
  providerMessageId?: string;
  error?: string;
  /** Endpoint/token is permanently invalid (e.g. 410) → retire the device. */
  gone?: boolean;
}

export interface ChannelAdapter {
  channel: NotificationChannel;
  /** sync = inline before the response; async = enqueued (queue/after) in P2. */
  mode: "sync" | "async";
  /** Send an already-built payload to one target. No business logic here. */
  send(target: DeliveryTarget, payload: NotificationPayload): Promise<DeliveryOutcome>;
}
