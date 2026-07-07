import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { THEMES, type Theme } from "@/lib/constants";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { isSameOrigin } from "@/lib/security/request-context";

/**
 * Persist UI preferences (locale, theme). Always sets the locale cookie; for
 * authenticated users it also writes the preference to their User profile.
 */
export async function PATCH(req: Request) {
  // CSRF defense: this cookie-authenticated, state-changing route lives outside
  // the Server-Action CSRF protection, so reject cross-site requests.
  if (!(await isSameOrigin(req))) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  let body: { locale?: string; theme?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const store = await cookies();

  if (isLocale(body.locale)) {
    store.set(LOCALE_COOKIE, body.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  const session = await auth();
  if (session?.user?.id) {
    const update: { locale?: string; theme?: Theme } = {};
    if (isLocale(body.locale)) update.locale = body.locale;
    if (body.theme && (THEMES as readonly string[]).includes(body.theme)) {
      update.theme = body.theme as Theme;
    }
    if (Object.keys(update).length > 0) {
      await connectToDatabase();
      await User.updateOne({ _id: session.user.id }, { $set: update });
    }
  }

  return NextResponse.json({ ok: true });
}
