import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Record that a push actually reached the device (fired by the Service Worker
 * on the `push` event). This is how Web Push — which has no server-side delivery
 * receipt — completes the `sent → delivered` lifecycle.
 *
 * Ownership-scoped and only ever advances the state (queued/sent → delivered);
 * it never regresses an already-clicked delivery.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const now = new Date();

  await connectToDatabase();
  await NotificationDelivery.updateMany(
    {
      notification: id,
      user: session.user.id,
      channel: "web_push",
      status: { $in: ["queued", "sent"] },
    },
    { $set: { status: "delivered", deliveredAt: now, statusUpdatedAt: now } },
  );

  return NextResponse.json({ ok: true });
}
