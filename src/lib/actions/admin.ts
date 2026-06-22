"use server";

import { revalidatePath } from "next/cache";
import { getAdminCtx } from "./guards";
import { runAction, ok, type ActionResult } from "./result";
import * as admin from "@/lib/services/admin";
import * as plans from "@/lib/services/plans";
import type { AccountStatus, PaymentMethod } from "@/lib/constants";
import type { PlanInput } from "@/lib/services/plans";

/* ---- Coach management ---- */

export async function setCoachStatusAction(
  coachId: string,
  status: AccountStatus,
): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await admin.setCoachStatus(coachId, status);
    revalidatePath("/admin/coaches");
    return ok();
  });
}

export async function deleteCoachAction(coachId: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await admin.deleteCoach(coachId);
    revalidatePath("/admin/coaches");
    revalidatePath("/admin");
    return ok();
  });
}

/* ---- Subscription management ---- */

export async function activateSubscriptionAction(
  coachId: string,
  input: {
    planId: string;
    months?: number;
    amount?: number;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
    notes?: string;
  },
): Promise<ActionResult> {
  return runAction(async () => {
    const { adminId } = await getAdminCtx();
    await admin.activateSubscription(adminId, coachId, input);
    revalidatePath("/admin/coaches");
    revalidatePath("/admin");
    return ok();
  });
}

export async function changePlanAction(coachId: string, planId: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await admin.changePlan(coachId, planId);
    revalidatePath("/admin/coaches");
    return ok();
  });
}

/* ---- Plan management ---- */

export async function createPlanAction(input: PlanInput): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await plans.createPlan(input);
    revalidatePath("/admin/plans");
    return ok();
  });
}

export async function updatePlanAction(id: string, input: PlanInput): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await plans.updatePlan(id, input);
    revalidatePath("/admin/plans");
    return ok();
  });
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await plans.deletePlan(id);
    revalidatePath("/admin/plans");
    return ok();
  });
}
