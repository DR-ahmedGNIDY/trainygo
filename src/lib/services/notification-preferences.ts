import { connectToDatabase } from "@/lib/db";
import { NotificationPreference } from "@/models/NotificationPreference";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  type NotificationType,
} from "@/lib/constants";

/** External channels a user can toggle (in-app is never user-disablable). */
export const USER_TOGGLEABLE_CHANNELS = NOTIFICATION_CHANNELS.filter((c) => c !== "in_app");

export interface NotificationPreferenceView {
  channels: Record<string, boolean>;
  mutedTypes: NotificationType[];
  quietHours: { enabled: boolean; start: string; end: string; timezone: string };
}

const DEFAULT_QUIET = { enabled: false, start: "22:00", end: "07:00", timezone: "Africa/Cairo" };

/** Raw preference doc for the dispatcher (lean). Null when the user has none. */
export async function getPreference(userId: string) {
  await connectToDatabase();
  return NotificationPreference.findOne({ user: userId }).lean();
}

/** UI-facing view with defaults filled in (every toggleable channel present). */
export async function getPreferenceView(userId: string): Promise<NotificationPreferenceView> {
  const pref = await getPreference(userId);
  const channels: Record<string, boolean> = {};
  for (const c of USER_TOGGLEABLE_CHANNELS) {
    const stored = (pref?.channels as Record<string, boolean> | undefined)?.[c];
    channels[c] = stored !== false; // default on
  }
  return {
    channels,
    mutedTypes: pref?.mutedTypes ?? [],
    quietHours: { ...DEFAULT_QUIET, ...(pref?.quietHours ?? {}) },
  };
}

export interface SavePreferenceInput {
  channels?: Record<string, boolean>;
  mutedTypes?: string[];
  quietHours?: { enabled?: boolean; start?: string; end?: string; timezone?: string };
}

const HM = /^\d{2}:\d{2}$/;

/**
 * Validate and persist a user's preferences (upsert). Unknown channels/types
 * are dropped rather than trusted, and times are shape-checked, so the stored
 * document is always well-formed for the resolver.
 */
export async function savePreference(userId: string, input: SavePreferenceInput) {
  await connectToDatabase();

  const channels: Record<string, boolean> = {};
  for (const c of USER_TOGGLEABLE_CHANNELS) {
    if (input.channels && c in input.channels) channels[c] = Boolean(input.channels[c]);
  }

  const mutedTypes = (input.mutedTypes ?? []).filter((t): t is NotificationType =>
    (NOTIFICATION_TYPES as readonly string[]).includes(t),
  );

  const q = input.quietHours ?? {};
  const quietHours = {
    enabled: Boolean(q.enabled),
    start: q.start && HM.test(q.start) ? q.start : DEFAULT_QUIET.start,
    end: q.end && HM.test(q.end) ? q.end : DEFAULT_QUIET.end,
    timezone: isValidTimezone(q.timezone) ? q.timezone! : DEFAULT_QUIET.timezone,
  };

  await NotificationPreference.updateOne(
    { user: userId },
    { $set: { channels, mutedTypes, quietHours } },
    { upsert: true },
  );

  return getPreferenceView(userId);
}

function isValidTimezone(tz?: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
