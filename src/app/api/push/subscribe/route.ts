import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Device } from "@/models/Device";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { isLocale } from "@/lib/i18n/config";

/**
 * Register (or refresh) the caller's Web Push subscription as a Device.
 *
 * Security: cookie-authenticated + same-origin (CSRF) + rate-limited. Ownership
 * is server-enforced — `user` is taken from the session, NEVER the body, so a
 * user can only ever register a device for themselves. Re-subscribing the same
 * browser upserts by a hash of the endpoint (token rotation), so it never
 * duplicates rows.
 */
interface SubscribeBody {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  /** Previous endpoint when the browser rotated the subscription — retired here. */
  oldEndpoint?: string;
  meta?: { deviceName?: string; os?: string; appVersion?: string; locale?: string };
}

export async function POST(req: Request) {
  if (!(await isSameOrigin(req))) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const limit = rateLimit(RATE_LIMITS.pushSubscribe, session.user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false, error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  const credentialHash = createHash("sha256").update(sub.endpoint).digest("hex");
  const locale = isLocale(body.meta?.locale) ? body.meta!.locale : undefined;

  await connectToDatabase();
  await Device.findOneAndUpdate(
    { credentialHash },
    {
      $set: {
        user: session.user.id, // ownership from session only
        platform: "web",
        transport: "webpush",
        credentials: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        credentialHash,
        deviceName: body.meta?.deviceName,
        os: body.meta?.os,
        appVersion: body.meta?.appVersion,
        ...(locale ? { locale } : {}),
        lastSeenAt: new Date(),
        disabledAt: null,
        failureCount: 0,
      },
    },
    { upsert: true, new: true },
  );

  // Token rotation: retire the browser's previous subscription if it changed.
  if (body.oldEndpoint && body.oldEndpoint !== sub.endpoint) {
    const oldHash = createHash("sha256").update(body.oldEndpoint).digest("hex");
    await Device.updateOne(
      { credentialHash: oldHash, user: session.user.id },
      { $set: { disabledAt: new Date() } },
    );
  }

  return NextResponse.json({ ok: true });
}
