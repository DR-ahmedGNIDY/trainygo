import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Record that the user opened a notification (fired by the Service Worker on
 * click). Ownership-scoped: only the recipient can mark their own notification,
 * so the click/read analytics can't be forged for someone else. Sets clickedAt
 * (once) and read, and flips any matching deliveries to "clicked".
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
  const res = await Notification.updateOne(
    { _id: id, recipient: session.user.id },
    { $set: { read: true, clickedAt: now } },
  );

  if (res.matchedCount === 0) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  await NotificationDelivery.updateMany(
    { notification: id, user: session.user.id },
    { $set: { status: "clicked", clickedAt: now, statusUpdatedAt: now } },
  );

  return NextResponse.json({ ok: true });
}
