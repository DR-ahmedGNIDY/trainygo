import { createHash } from "crypto";
import { after } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Notification, type INotification, type INotificationTarget } from "@/models/Notification";
import { Device } from "@/models/Device";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import type { NotificationType } from "@/lib/constants";
import { allChannels } from "./channels";
import { resolveLink } from "./deep-link";
import { renderTemplate } from "./templates";
import { buildPayload } from "./payload";
import { resolveDestinations } from "./destinations";
import { runHooks } from "./hooks";
import { sendWithRetry, MAX_DEVICE_FAILURES } from "./retry";
import { isChannelAllowed } from "./preferences";
import { getPreference } from "@/lib/services/notification-preferences";
import type {
  DispatchInput,
  TemplatedDispatchInput,
  DispatchResult,
} from "./dispatcher.types";

export type {
  DispatchInput,
  RawDispatchInput,
  TemplatedDispatchInput,
  DispatchResult,
} from "./dispatcher.types";

/**
 * ─── Notification Dispatcher ────────────────────────────────────────────────
 *
 * The one entry point business code uses. Channel- AND provider-agnostic: it
 * renders content, persists ONE Notification (source of truth), then fans out
 * to registered channels. It never imports a transport library or a provider.
 *
 * Stages fire event hooks (see hooks.ts) so audit/analytics/automation plug in
 * without editing this file. Because the save happens first and unconditionally,
 * no notification is lost if a downstream channel or hook fails.
 */

function isTemplated(input: DispatchInput): input is TemplatedDispatchInput {
  return "templateKey" in input;
}

/** Stable, collision-resistant dedupe key scoped to a recipient. */
function makeDedupeKey(recipient: string, idempotencyKey: string): string {
  return createHash("sha256").update(`${recipient}:${idempotencyKey}`).digest("hex");
}

interface ResolvedContent {
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  target?: INotificationTarget;
  templateKey?: string;
  templateVersion?: number;
}

function resolveContent(input: DispatchInput): ResolvedContent {
  if (isTemplated(input)) {
    const r = renderTemplate(input.templateKey, input.params, input.version);
    return {
      type: r.type,
      titleAr: r.titleAr,
      titleEn: r.titleEn,
      bodyAr: r.bodyAr,
      bodyEn: r.bodyEn,
      target: input.target ?? r.target,
      templateKey: input.templateKey,
      templateVersion: r.version,
    };
  }
  return {
    type: input.type,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr,
    bodyEn: input.bodyEn,
    target: input.target,
  };
}

/**
 * Record the in-app delivery so EVERY channel — in-app included — flows through
 * the same NotificationDelivery model, keeping lifecycle and analytics unified
 * in one place. In-app is delivered the instant the record is saved, so this is
 * a small synchronous insert. It is isolated: a failure here is logged and
 * swallowed, never breaking the already-persisted notification (source of
 * truth). Idempotent via the unique (notification, channel, deviceId) index.
 */
async function recordInAppDelivery(recipient: string, doc: INotification): Promise<void> {
  const now = new Date();
  try {
    await NotificationDelivery.create({
      notification: doc._id,
      user: recipient,
      channel: "in_app",
      deviceId: null,
      status: "delivered",
      statusUpdatedAt: now,
      sentAt: now,
      deliveredAt: now,
    });
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) return; // already recorded
    console.error("[notify] in-app delivery record failed", err);
  }
}

/**
 * Deliver a persisted notification across external channels. Runs deferred
 * (after the response) so a slow/failing transport never blocks the request.
 *
 * Idempotent per (notification, channel, device) via a unique index, so a
 * re-run (e.g. retry) never double-sends. Device knowledge and payload building
 * both live in this layer; adapters only send.
 */
async function fanOut(recipient: string, doc: INotification): Promise<void> {
  // Load the recipient's preferences ONCE (one indexed query, no N+1) — the
  // per-(channel,type) decision is identical for all of a channel's devices.
  const pref = await getPreference(recipient);
  const now = new Date();

  for (const adapter of allChannels()) {
    // Preference gate: in-app is never gated (already delivered); external
    // channels honor mutes, quiet hours, and master switches.
    if (!isChannelAllowed(pref, adapter.channel, doc.type, now)) continue;

    const targets = await resolveDestinations(recipient, adapter.channel);
    for (const target of targets) {
      // Duplicate-send guard: skip if a delivery for this device already exists.
      let delivery;
      try {
        delivery = await NotificationDelivery.create({
          notification: doc._id,
          user: recipient,
          channel: adapter.channel,
          deviceId: target.deviceId,
          locale: target.locale,
          status: "queued",
          statusUpdatedAt: new Date(),
        });
      } catch (err: unknown) {
        if ((err as { code?: number })?.code === 11000) continue; // already sent
        throw err;
      }

      const payload = buildPayload(doc, target.locale);

      await runHooks({
        stage: "beforeChannelSend",
        recipient,
        notification: doc,
        channel: adapter.channel,
        target,
        payload,
      });

      const { outcome, attempts } = await sendWithRetry(adapter, target, payload);
      const success = outcome.status === "sent" || outcome.status === "delivered";

      const now = new Date();
      await NotificationDelivery.updateOne(
        { _id: delivery._id },
        {
          $set: {
            status: outcome.status,
            statusUpdatedAt: now,
            attempts,
            error: outcome.error ?? null,
            providerMessageId: outcome.providerMessageId ?? null,
            ...(success ? { sentAt: now } : {}),
          },
        },
      );

      // Device lifecycle. Permanent failure (410/404/invalid) retires the device
      // immediately; a healthy send clears the failure streak; a transient
      // failure increments it and retires the device once it crosses the cap.
      if (target.deviceId) {
        if (outcome.gone) {
          await Device.updateOne({ _id: target.deviceId }, { $set: { disabledAt: now } });
        } else if (success) {
          await Device.updateOne(
            { _id: target.deviceId },
            { $set: { failureCount: 0, lastSeenAt: now } },
          );
        } else {
          const d = await Device.findOneAndUpdate(
            { _id: target.deviceId },
            { $inc: { failureCount: 1 } },
            { new: true },
          ).lean();
          if (d && d.failureCount >= MAX_DEVICE_FAILURES) {
            await Device.updateOne({ _id: target.deviceId }, { $set: { disabledAt: now } });
          }
        }
      }

      await runHooks({
        stage: "afterChannelSend",
        recipient,
        notification: doc,
        channel: adapter.channel,
        target,
        payload,
        outcome,
      });
    }
  }
}

/** Schedule external fan-out after the response; fall back to inline if there's no request scope. */
function scheduleFanOut(recipient: string, doc: INotification): void {
  const job = () =>
    fanOut(recipient, doc).catch((err) => console.error("[notify] fanOut failed", err));
  try {
    after(job);
  } catch {
    void job(); // outside a request scope (e.g. scripts) — detached best-effort.
  }
}

/**
 * Emit a notification. Persists first (source of truth), then fans out.
 * Returns the notification id and whether it was deduplicated.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  await connectToDatabase();

  const content = resolveContent(input);
  const dedupeKey = input.idempotencyKey
    ? makeDedupeKey(input.recipient, input.idempotencyKey)
    : undefined;

  await runHooks({ stage: "beforeDispatch", recipient: input.recipient, input });

  // Idempotency pre-check: return the existing record without re-fanning-out.
  if (dedupeKey) {
    const existing = await Notification.findOne({
      recipient: input.recipient,
      dedupeKey,
    })
      .select("_id")
      .lean();
    if (existing) return { id: String(existing._id), deduped: true };
  }

  const link = input.link ?? (content.target ? resolveLink(content.target) : undefined);

  let doc: INotification;
  try {
    doc = await Notification.create({
      recipient: input.recipient,
      type: content.type,
      titleAr: content.titleAr,
      titleEn: content.titleEn,
      bodyAr: content.bodyAr,
      bodyEn: content.bodyEn,
      link,
      target: content.target,
      templateKey: content.templateKey,
      templateVersion: content.templateVersion,
      dedupeKey,
    });
  } catch (err: unknown) {
    // Race-safe backstop: a concurrent insert won the unique (recipient,dedupeKey).
    if ((err as { code?: number })?.code === 11000 && dedupeKey) {
      const existing = await Notification.findOne({
        recipient: input.recipient,
        dedupeKey,
      })
        .select("_id")
        .lean();
      if (existing) return { id: String(existing._id), deduped: true };
    }
    throw err;
  }

  await runHooks({ stage: "afterNotificationSaved", recipient: input.recipient, input, notification: doc });

  // In-app is delivered the moment it's saved — record it through the same model
  // as every other channel so analytics/lifecycle stay unified.
  await recordInAppDelivery(input.recipient, doc);

  // Only schedule deferred work if there's actually an external channel to hit —
  // preserves the exact in-app-only behaviour when no push is configured.
  if (!input.skipExternalFanOut && allChannels().length) {
    scheduleFanOut(input.recipient, doc);
  }

  await runHooks({ stage: "afterDispatchCompleted", recipient: input.recipient, input, notification: doc });

  return { id: String(doc._id), deduped: false };
}
