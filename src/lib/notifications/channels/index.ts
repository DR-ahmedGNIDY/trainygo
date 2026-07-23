import type { NotificationChannel } from "@/lib/constants";
import type { ChannelAdapter } from "./types";
import { webPushAdapter } from "./web-push";

/**
 * Registry of EXTERNAL transport adapters (Web Push, FCM, Email, SMS, …).
 *
 * In-app is deliberately NOT here: the saved Notification record *is* the
 * in-app delivery and the source of truth, so it needs no transport. This
 * registry only holds channels that push a payload somewhere off-server.
 *
 * The Dispatcher iterates this registry; it has no hard-coded knowledge of any
 * transport. Enabling a channel later is a one-line registration plus its
 * adapter file — the Dispatcher, models, and business logic stay untouched.
 */
const REGISTRY = new Map<NotificationChannel, ChannelAdapter>();

export function registerChannel(adapter: ChannelAdapter): void {
  REGISTRY.set(adapter.channel, adapter);
}

export function getChannel(channel: NotificationChannel): ChannelAdapter | undefined {
  return REGISTRY.get(channel);
}

export function allChannels(): ChannelAdapter[] {
  return [...REGISTRY.values()];
}

// External channels self-register here. Web Push registers only when VAPID keys
// are present, so a dev/env without keys simply has no push channel (in-app
// still works). FCM/Email/SMS/WhatsApp add one registration line each.
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  registerChannel(webPushAdapter);
}

export type { ChannelAdapter } from "./types";
