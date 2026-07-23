import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security/request-context";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  getPreferenceView,
  savePreference,
  type SavePreferenceInput,
} from "@/lib/services/notification-preferences";

/**
 * The caller's own notification preferences. Read (GET) and update (PUT).
 *
 * Always scoped to the session user — a user can only ever read/write their own
 * preferences (no id in the path or body). PUT is CSRF-guarded and rate-limited;
 * the service validates and normalizes the payload before persisting.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const preferences = await getPreferenceView(session.user.id);
  return NextResponse.json({ ok: true, preferences });
}

export async function PUT(req: Request) {
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

  let body: SavePreferenceInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const preferences = await savePreference(session.user.id, body);
  return NextResponse.json({ ok: true, preferences });
}
