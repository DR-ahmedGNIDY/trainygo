import { auth } from "@/lib/auth";
import { assertCoachCanWrite, PermissionError } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
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
  return { coachId: session.user.id, status: session.user.status };
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
