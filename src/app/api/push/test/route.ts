import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { getChannel, allChannels } from "@/lib/notifications/channels";
import { resolveDestinations } from "@/lib/notifications/destinations";
import { buildPayload } from "@/lib/notifications/payload";
import { connectToDatabase } from "@/lib/db";
import { Device } from "@/models/Device";
import { Notification } from "@/models/Notification";

/**
 * Send the CURRENT user a test notification. Diagnostic only: it always creates
 * an in-app notification (bell) and additionally a web-push when the user has a
 * subscription and VAPID keys are configured — so it isolates where a problem
 * is. Scoped to the session user; a user can only test-notify themselves.
 */
export async function POST(req: Request) {
  if (!(await isSameOrigin(req))) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const limit = rateLimit(RATE_LIMITS.notificationEvent, session.user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Diagnostics computed synchronously (the actual push send runs after the
  // response, so we report what CAN be known now): is a web-push channel
  // registered (VAPID configured on the server?) and does the user have a live
  // subscription on any device?
  const webPushConfigured = allChannels().some((c) => c.channel === "web_push");
  await connectToDatabase();
  const devices = await Device.countDocuments({
    user: session.user.id,
    transport: "webpush",
    disabledAt: null,
  });

  // Persist the in-app notification (bell) but SKIP the deferred fan-out so we
  // can send to web push synchronously below and capture the real outcome.
  const result = await dispatchNotification({
    recipient: session.user.id,
    type: "system",
    titleAr: "إشعار تجريبي من FITXNET",
    titleEn: "Test notification from FITXNET",
    bodyAr: "وصلك هذا الإشعار؟ إذًا كل شيء يعمل بنجاح ✅",
    bodyEn: "Got this? Then everything works ✅",
    link: "/",
    skipExternalFanOut: true,
  });

  // Synchronous diagnostic push: report the actual per-device outcome so the UI
  // can surface a real reason (e.g. 403 = VAPID key mismatch, 410 = expired).
  const push: { status: string; error?: string }[] = [];
  const adapter = getChannel("web_push");
  if (adapter) {
    const doc = await Notification.findById(result.id).lean();
    if (doc) {
      const targets = await resolveDestinations(session.user.id, "web_push");
      for (const target of targets) {
        const payload = buildPayload(doc, target.locale);
        const outcome = await adapter.send(target, payload);
        push.push({ status: outcome.status, error: outcome.error });
      }
    }
  }

  const pushFailed = push.find((p) => p.status === "failed");
  return NextResponse.json({
    ok: true,
    webPushConfigured,
    devices,
    pushSent: push.some((p) => p.status === "sent" || p.status === "delivered"),
    pushError: pushFailed?.error ?? null,
  });
}
