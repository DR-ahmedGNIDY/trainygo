import { auth } from "@/lib/auth";
import { assertCoachCanWrite, PermissionError } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import { syncCoachStatus } from "@/lib/services/subscription";
import type { AccountStatus } from "@/lib/constants";

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
