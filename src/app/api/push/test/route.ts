import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { dispatchNotification } from "@/lib/notifications/dispatcher";

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

  await dispatchNotification({
    recipient: session.user.id,
    type: "system",
    titleAr: "إشعار تجريبي من FITXNET",
    titleEn: "Test notification from FITXNET",
    bodyAr: "وصلك هذا الإشعار؟ إذًا كل شيء يعمل بنجاح ✅",
    bodyEn: "Got this? Then everything works ✅",
    link: "/",
  });

  return NextResponse.json({ ok: true });
}
