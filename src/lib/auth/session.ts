import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import type { UserRole } from "@/lib/constants";

/** Require any authenticated session, else redirect to /login. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
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
