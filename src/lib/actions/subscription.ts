"use server";

import { auth } from "@/lib/auth";
import { runAction, ok, fail, type ActionResult } from "./result";
import { syncCoachStatus, getCoachSubscriptionSummary, getClientAccessState } from "@/lib/services/subscription";
import type { AccountStatus } from "@/lib/constants";

export interface CoachSubscriptionLive {
  status: AccountStatus;
  endDate: string | null;
}

/** Re-derives the coach's real-time status/end-date from the database, for client-side polling. */
export async function getCoachSubscriptionLiveAction(): Promise<ActionResult<CoachSubscriptionLive>> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user || session.user.role !== "coach") return fail("Forbidden", "FORBIDDEN");
    const status = await syncCoachStatus(session.user.id);
    const summary = await getCoachSubscriptionSummary(session.user.id);
    return ok({ status, endDate: summary.endDate ? summary.endDate.toISOString() : null });
  });
}

export interface ClientAccessLive {
  frozen: boolean;
  frozenReason: "frozen_by_coach" | "coach" | "self" | null;
  frozenRemainingDays: number | null;
  endDate: string | null;
}

/** Re-derives the client's real-time access state, for client-side polling. */
export async function getClientAccessLiveAction(): Promise<ActionResult<ClientAccessLive>> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") return fail("Forbidden", "FORBIDDEN");
    const access = await getClientAccessState(session.user.id);
    return ok({
      frozen: access.frozen,
      frozenReason: access.frozenReason,
      frozenRemainingDays: access.frozenRemainingDays,
      endDate: access.subscriptionEndDate ? access.subscriptionEndDate.toISOString() : null,
    });
  });
}
