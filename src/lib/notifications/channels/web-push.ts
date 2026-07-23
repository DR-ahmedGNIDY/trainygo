import webpush from "web-push";
import type { ChannelAdapter, DeliveryTarget, NotificationPayload, DeliveryOutcome } from "./types";

/**
 * Web Push transport adapter.
 *
 * This is the ONLY file that imports `web-push` or knows the VAPID protocol.
 * Everything provider-specific is contained here: swapping to Firebase /
 * OneSignal / SNS later means writing a sibling adapter, with zero change to
 * models, the Dispatcher, or business logic. It receives a finished payload and
 * a target, sends, and reports a neutral outcome.
 */

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@fitxnet.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export const webPushAdapter: ChannelAdapter = {
  channel: "web_push",
  mode: "async",

  async send(target: DeliveryTarget, payload: NotificationPayload): Promise<DeliveryOutcome> {
    if (!ensureConfigured()) {
      return { status: "failed", error: "VAPID not configured" };
    }
    const creds = target.credentials;
    if (!creds?.endpoint || !creds.keys?.p256dh || !creds.keys?.auth) {
      // Corrupt/missing subscription is permanent — don't retry, retire it.
      return { status: "failed", error: "Invalid web push subscription", gone: true };
    }

    const subscription = {
      endpoint: creds.endpoint,
      keys: { p256dh: creds.keys.p256dh, auth: creds.keys.auth },
    };
    // The payload is already built by the Dispatcher — the SW reads these keys.
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      link: payload.link,
      target: payload.target,
      data: payload.data ?? {},
    });

    try {
      const res = await webpush.sendNotification(subscription, body);
      return {
        status: "sent",
        providerMessageId: res.headers?.location || res.headers?.["x-request-id"],
      };
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404/410 = subscription is permanently gone → retire the device.
      if (statusCode === 404 || statusCode === 410) {
        return { status: "failed", error: `gone (${statusCode})`, gone: true };
      }
      return {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
