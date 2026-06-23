import type { AccountStatus, UserRole } from "@/lib/constants";

/**
 * Central authorization rules for Trainygo. Kept pure (status in → boolean out)
 * so the same logic drives middleware, server actions, and UI affordances.
 */

/** Statuses that allow signing in at all. Suspended accounts are blocked. */
export function accountCanLogin(status: AccountStatus): boolean {
  return status !== "suspended";
}

/**
 * Whether a coach may CREATE or MODIFY data (clients, programs, nutrition
 * plans, templates, custom exercises). Trial + active only.
 *
 * Expired coaches keep read access but lose all write access (read-only mode).
 * Suspended coaches are blocked from login entirely, but we still return false
 * here as a defense-in-depth fallback.
 */
export function coachCanWrite(status: AccountStatus): boolean {
  return status === "trial" || status === "active";
}

/** True when a coach is in read-only mode (logged in but write-locked). */
export function coachIsReadOnly(status: AccountStatus): boolean {
  return status === "expired";
}

/**
 * True when a coach's trial/subscription has lapsed (expired or suspended) —
 * the condition under which their clients are frozen, regardless of whether
 * the coach themself can still log in.
 */
export function coachIsFrozen(status: AccountStatus): boolean {
  return !coachCanWrite(status);
}

/**
 * Derives the real-time account status from stored dates, so a "trial" or
 * "active" coach whose period has lapsed is treated as "expired" even before
 * any admin/cron job updates the stored `status` field. Suspended stays
 * suspended (admin-driven, not date-driven).
 */
export function computeEffectiveCoachStatus(
  status: AccountStatus,
  trialEndDate?: Date | null,
  subscriptionEndDate?: Date | null,
): AccountStatus {
  if (status === "suspended") return status;
  const now = Date.now();
  if (status === "trial" && trialEndDate && trialEndDate.getTime() < now) {
    return "expired";
  }
  if (
    status === "active" &&
    subscriptionEndDate &&
    subscriptionEndDate.getTime() < now
  ) {
    return "expired";
  }
  return status;
}

/** Error thrown when a write is attempted without permission. */
export class PermissionError extends Error {
  code: string;
  constructor(message = "PERMISSION_DENIED", code = "PERMISSION_DENIED") {
    super(message);
    this.name = "PermissionError";
    this.code = code;
  }
}

/**
 * Guard for coach write actions. Throws PermissionError when the coach is in
 * read-only (expired) or suspended state. Call at the top of any coach server
 * action that creates or modifies coach-owned data.
 */
export function assertCoachCanWrite(status: AccountStatus): void {
  if (!coachCanWrite(status)) {
    throw new PermissionError(
      "Your subscription has expired. Your account is in read-only mode.",
      "COACH_READ_ONLY",
    );
  }
}

/** Which dashboard a role lands on after login. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "coach":
      return "/coach";
    case "client":
      return "/client";
    default:
      return "/";
  }
}

/** Route-group prefix a role is allowed to access. */
export function allowedPrefixForRole(role: UserRole): string {
  return homePathForRole(role);
}
