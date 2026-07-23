import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Device } from "@/models/Device";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Disable the caller's Web Push subscription.
 *
 * Ownership-scoped: only a device belonging to the authenticated user (matched
 * by endpoint hash AND user) is disabled, so no one can unsubscribe another
 * user's device.
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

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }
  if (!body.endpoint) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const credentialHash = createHash("sha256").update(body.endpoint).digest("hex");
  await connectToDatabase();
  await Device.updateOne(
    { credentialHash, user: session.user.id },
    { $set: { disabledAt: new Date() } },
  );

  return NextResponse.json({ ok: true });
}
