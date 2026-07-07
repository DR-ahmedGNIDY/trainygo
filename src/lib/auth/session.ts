import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import type { UserRole } from "@/lib/constants";
import type { TeamPermissionContext } from "@/lib/permissions/team";
import type { CoachAreaCtx } from "@/lib/actions/guards";

/**
 * Require any authenticated session, else redirect to /login.
 *
 * Also enforces IMMEDIATE revocation: a single indexed lookup confirms the
 * account still exists, is not suspended, and the JWT's `sessionVersion`
 * matches the DB. Bumping `sessionVersion` (or suspending) therefore kills all
 * existing sessions on the very next request, without waiting for token expiry.
 * Fails open only on unexpected DB errors (never on an explicit revocation).
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const { connectToDatabase } = await import("@/lib/db");
    const { User } = await import("@/models/User");
    await connectToDatabase();
    const fresh = await User.findById(session.user.id)
      .select("status sessionVersion")
      .lean();

    const tokenVersion = session.user.sessionVersion ?? 0;
    if (
      !fresh ||
      fresh.status === "suspended" ||
      (fresh.sessionVersion ?? 0) !== tokenVersion
    ) {
      await signOut({ redirect: false }).catch(() => {});
      redirect("/login");
    }
  } catch (err) {
    // `redirect()` throws a NEXT_REDIRECT control-flow error — re-throw it so
    // the redirect actually happens; swallow only genuine DB errors.
    if (err && typeof err === "object" && "digest" in err) throw err;
    // DB unreachable: fail open (the JWT was still cryptographically valid).
  }

  return session;
}

/**
 * Require a session with a specific role. Wrong role → redirected to that
 * user's own dashboard. Use at the top of role-scoped layouts/pages as
 * defense-in-depth alongside middleware.
 */
export async function requireRole(role: UserRole) {
  const session = await requireSession();
  if (session.user.role !== role) {
    redirect(homePathForRole(session.user.role));
  }
  return session;
}

/**
 * Require access to the shared /coach route tree — either a coach acting on
 * their own account, or a team member acting on behalf of their owner coach.
 * Reused coach pages call this instead of `requireRole("coach")` so the same
 * page serves both, gated by an optional permission check (never a
 * hardcoded role check). Pass a `canAccessX`/`canManageX` helper from
 * src/lib/permissions/team.ts as `check` for any module that isn't open to
 * every team member by default.
 */
export async function requireCoachArea(
  check?: (ctx: TeamPermissionContext) => boolean,
): Promise<CoachAreaCtx> {
  const session = await requireSession();
  if (session.user.role !== "coach" && session.user.role !== "team_member") {
    redirect(homePathForRole(session.user.role));
  }

  const { getCoachAreaCtx } = await import("@/lib/actions/guards");
  let ctx: CoachAreaCtx;
  try {
    ctx = await getCoachAreaCtx();
  } catch {
    redirect(homePathForRole(session.user.role));
  }

  if (check && !check(ctx)) {
    redirect("/coach");
  }

  return ctx;
}
