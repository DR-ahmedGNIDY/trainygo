import type { NotificationChannel, NotificationType } from "@/lib/constants";
import type { IQuietHours } from "@/models/NotificationPreference";

/**
 * Tolerant preference shape: accepts both a hydrated doc (channels as a Map)
 * and a `.lean()` read (channels as a plain object), so the dispatcher can pass
 * a lean document straight in.
 */
export interface PreferenceLike {
  channels?: Map<string, boolean> | Record<string, boolean>;
  mutedTypes?: readonly string[];
  overrides?: readonly { type: string; channel: string; enabled: boolean }[];
  quietHours?: IQuietHours;
}

/**
 * Decide whether one channel may deliver one notification type for a user,
 * given their preferences and the current time. Pure and side-effect free.
 *
 * in-app is NEVER gated here (it's the source of truth). This is only consulted
 * for external channels in the dispatcher's fan-out.
 *
 * Precedence (first match wins):
 *  1. in-app            → always allowed.
 *  2. quiet hours       → blanket do-not-disturb for external channels.
 *  3. explicit override → per-(type, channel) on/off.
 *  4. muted type        → type silenced across channels.
 *  5. channel master    → channel switched off.
 *  6. default           → allowed.
 */
export function isChannelAllowed(
  pref: PreferenceLike | null | undefined,
  channel: NotificationChannel,
  type: NotificationType,
  now: Date = new Date(),
): boolean {
  if (channel === "in_app") return true;
  if (!pref) return true; // no preferences saved → everything on.

  if (pref.quietHours?.enabled && isWithinQuietHours(pref.quietHours, now)) {
    return false;
  }

  const override = pref.overrides?.find((o) => o.type === type && o.channel === channel);
  if (override) return override.enabled;

  if (pref.mutedTypes?.includes(type)) return false;

  // `channels` is a Mongoose Map on hydrated docs, a plain object on lean reads.
  const channelValue = readChannel(pref.channels, channel);
  if (channelValue === false) return false;

  return true;
}

function readChannel(
  channels: Map<string, boolean> | Record<string, boolean> | undefined,
  channel: string,
): boolean | undefined {
  if (!channels) return undefined;
  if (channels instanceof Map) return channels.get(channel);
  return (channels as Record<string, boolean>)[channel];
}

/** HH:MM (24h) → minutes since midnight, or null if malformed. */
function parseHm(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * True when `now` falls inside the quiet-hours window in the configured
 * timezone. Handles overnight windows (e.g. 22:00→07:00). Fails open (returns
 * false) on any malformed time or timezone, so a bad config never silences a
 * user unexpectedly.
 */
export function isWithinQuietHours(quiet: IQuietHours, now: Date = new Date()): boolean {
  const start = parseHm(quiet.start);
  const end = parseHm(quiet.end);
  if (start === null || end === null) return false;

  let current: number;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: quiet.timezone || "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN");
    const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN");
    if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
    current = (hh % 24) * 60 + mm;
  } catch {
    return false; // invalid timezone → don't suppress.
  }

  if (start === end) return false; // zero-length window.
  return start < end
    ? current >= start && current < end // same-day window
    : current >= start || current < end; // overnight window
}
