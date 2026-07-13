import { auth } from "@/lib/auth";
import { assertCoachCanWrite, PermissionError } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { syncCoachStatus } from "@/lib/services/subscription";
import {
  FULL_TEAM_PERMISSIONS,
  type TeamPermissionContext,
} from "@/lib/permissions/team";
import type { AccountStatus } from "@/lib/constants";
import type { ITeamPermissions } from "@/models/User";

export interface CoachCtx {
  coachId: string;
  status: AccountStatus;
}

/** Resolve the current coach context, or throw if the caller is not a coach. */
export async function getCoachCtx(): Promise<CoachCtx> {
  const session = await auth();
  if (!session?.user || session.user.role !== "coach") {
    throw new PermissionError("Forbidden", "NOT_COACH");
  }
  await connectToDatabase();
  // Re-derive status from trial/subscription dates so a long-lived session
  // can't keep writing past expiry until the next login.
  const status = await syncCoachStatus(session.user.id);
  return { coachId: session.user.id, status };
}

/**
 * Coach context for WRITE actions. Enforces the subscription gate server-side:
 * expired/suspended coaches are read-only and cannot mutate data.
 */
export async function getCoachWriteCtx(): Promise<CoachCtx> {
  const ctx = await getCoachCtx();
  assertCoachCanWrite(ctx.status);
  return ctx;
}

/**
 * Combined context for the shared /coach route tree, covering BOTH a coach
 * acting on their own account and a team member acting on behalf of their
 * owner coach. `coachId` is always the value every service/query must scope
 * by — for a coach that's their own id, for a team member it's
 * `teamProfile.ownerCoachId`. Never use `session.user.id` directly for data
 * scoping in a page/action that a team member might reach.
 */
export interface CoachAreaCtx extends TeamPermissionContext {
  /** The signed-in user's own id (for audit/notification purposes only — never for data scoping). */
  actingUserId: string;
  /** The coach account whose data this request operates on. Always use this for ownerCoachId-scoped queries. */
  coachId: string;
  /** The OWNER coach's effective subscription status — an expired/suspended owner freezes their team members too, exactly like their clients. */
  status: AccountStatus;
}

/**
 * Resolves either a coach or a team member into a single CoachAreaCtx.
 * Throws if the caller is neither, if a team member's owner coach can't be
 * found, or if the owner has suspended this team member's access.
 */
export async function getCoachAreaCtx(): Promise<CoachAreaCtx> {
  const session = await auth();
  if (!session?.user) throw new PermissionError("Forbidden", "NOT_AUTHENTICATED");

  if (session.user.role === "coach") {
    const status = await syncCoachStatus(session.user.id);
    return {
      actingUserId: session.user.id,
      coachId: session.user.id,
      status,
      role: "coach",
      permissions: FULL_TEAM_PERMISSIONS,
    };
  }

  if (session.user.role === "team_member") {
    await connectToDatabase();
    const member = await User.findOne({ _id: session.user.id, role: "team_member" })
      .select("teamProfile")
      .lean();
    if (!member?.teamProfile) throw new PermissionError("Forbidden", "NOT_TEAM_MEMBER");
    if (member.teamProfile.suspendedByOwner) {
      throw new PermissionError("تم إيقاف وصولك من قِبل المدرب.", "TEAM_SUSPENDED");
    }
    const ownerCoachId = String(member.teamProfile.ownerCoachId);
    const status = await syncCoachStatus(ownerCoachId);
    return {
      actingUserId: session.user.id,
      coachId: ownerCoachId,
      status,
      role: "team_member",
      permissions: member.teamProfile.permissions as ITeamPermissions,
    };
  }

  throw new PermissionError("Forbidden", "NOT_COACH");
}

/** CoachAreaCtx for WRITE actions: enforces the owner's subscription gate (expired/suspended owner ⇒ read-only for the whole team). */
export async function getCoachAreaWriteCtx(): Promise<CoachAreaCtx> {
  const ctx = await getCoachAreaCtx();
  assertCoachCanWrite(ctx.status);
  return ctx;
}

/** getCoachAreaCtx() + a required permission check — for actions any team member with the right permission may reach, no subscription write-gate (e.g. branding, which stays editable even for an expired coach). */
export async function getCoachAreaCtxFor(
  check: (ctx: TeamPermissionContext) => boolean,
): Promise<CoachAreaCtx> {
  const ctx = await getCoachAreaCtx();
  assertPermission(ctx, check);
  return ctx;
}

/** getCoachAreaWriteCtx() + a required permission check — the standard guard for a write action a team member might reach. */
export async function getCoachAreaWriteCtxFor(
  check: (ctx: TeamPermissionContext) => boolean,
): Promise<CoachAreaCtx> {
  const ctx = await getCoachAreaWriteCtx();
  assertPermission(ctx, check);
  return ctx;
}

/**
 * Resolves a Scope union compatible with the exercises/foods/templates
 * services (`{ role: "super_admin" } | { role: "coach"; coachId }`).
 * A team member with the right permission resolves to `{ role: "coach",
 * coachId: ownerCoachId }` — the service layer never needs to know a team
 * member made the request, only whose data to scope by.
 */
export async function resolveCoachAreaScope(
  check: (ctx: TeamPermissionContext) => boolean,
): Promise<{ role: "super_admin" } | { role: "coach"; coachId: string }> {
  const session = await auth();
  if (session?.user?.role === "super_admin") return { role: "super_admin" };
  if (session?.user?.role === "coach" || session?.user?.role === "team_member") {
    const ctx = await getCoachAreaWriteCtxFor(check);
    return { role: "coach", coachId: ctx.coachId };
  }
  throw new PermissionError("Forbidden", "FORBIDDEN");
}

/**
 * Enforces a single permission on an already-resolved CoachAreaCtx. Call
 * this at the top of every action a team member could reach — never trust
 * page-level gating alone, since actions can be invoked directly.
 */
export function assertPermission(
  ctx: TeamPermissionContext,
  check: (ctx: TeamPermissionContext) => boolean,
): void {
  if (!check(ctx)) {
    throw new PermissionError("ليس لديك صلاحية للوصول إلى هذا القسم.", "NO_PERMISSION");
  }
}

/** Resolve the current super-admin id, or throw. */
export async function getAdminCtx(): Promise<{ adminId: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    throw new PermissionError("Forbidden", "NOT_ADMIN");
  }
  await connectToDatabase();
  return { adminId: session.user.id };
}

/** Resolve the current client id, or throw. */
export async function getClientCtx(): Promise<{ clientId: string; coachId?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "client") {
    throw new PermissionError("Forbidden", "NOT_CLIENT");
  }
  await connectToDatabase();
  return { clientId: session.user.id };
}

/**
 * Client context for actions that require an active subscription: starting a
 * workout session, submitting a check-in, sending a workout report, and
 * messaging. Throws with a user-facing message when frozen (by the coach's
 * lapsed subscription, or the client's own).
 */
export async function getClientWriteCtx(): Promise<{ clientId: string }> {
  const { clientId } = await getClientCtx();
  const { getClientAccessState } = await import("@/lib/services/subscription");
  const access = await getClientAccessState(clientId);
  if (access.frozen) {
    if (access.frozenReason === "frozen_by_coach") {
      throw new PermissionError(
        "تم تجميد اشتراكك مؤقتاً. يرجى التواصل مع المدرب.",
        "SUBSCRIPTION_FROZEN",
      );
    }
    if (access.frozenReason === "coach") {
      throw new PermissionError(
        "حسابك قيد التجميد حالياً نتيجة تجميد حساب المدرب الخاص بك.",
        "COACH_FROZEN",
      );
    }
    throw new PermissionError(
      "انتهى اشتراكك. يرجى التواصل مع مدربك لتجديده.",
      "CLIENT_EXPIRED",
    );
  }
  return { clientId };
}
