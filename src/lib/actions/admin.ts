"use server";

import { revalidatePath } from "next/cache";
import { getAdminCtx } from "./guards";
import { runAction, ok, type ActionResult } from "./result";
import * as admin from "@/lib/services/admin";
import * as plans from "@/lib/services/plans";
import { setCoachBrandingEnabled } from "@/lib/services/feature-access";
import { resetPlans, type ResetPlansResult } from "@/lib/services/reset-plans";
import { repairPlanDuration, type RepairPlanDurationResult } from "@/lib/services/repair-plan-duration";
import type { AccountStatus, PaymentMethod } from "@/lib/constants";
import type { PlanInput } from "@/lib/services/plans";
import { logError } from "@/lib/logging/error-log";

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

export async function suspendCoachSubscriptionAction(coachId: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await admin.suspendCoachSubscription(coachId);
    revalidatePath("/admin/coaches");
    return ok();
  });
}

export async function reactivateCoachSubscriptionAction(coachId: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await admin.reactivateCoachSubscription(coachId);
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

export async function setCoachBrandingAccessAction(
  coachId: string,
  enabled: boolean | null,
): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await setCoachBrandingEnabled(coachId, enabled);
    revalidatePath("/admin/coaches");
    return ok();
  });
}

/* ---- Subscription management ---- */

export async function activateSubscriptionAction(
  coachId: string,
  input: {
    planId: string;
    amount?: number;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
    notes?: string;
  },
): Promise<ActionResult> {
  return runAction(async () => {
    const { adminId } = await getAdminCtx();
    let result: Awaited<ReturnType<typeof admin.activateSubscription>>;
    try {
      result = await admin.activateSubscription(adminId, coachId, input);
    } catch (error) {
      await logError(
        {
          type: "SUBSCRIPTION_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: adminId,
          route: "/admin/coaches",
          action: "activateSubscription",
          context: { coachId, ...input },
        },
        error,
      );
      throw error;
    }
    // Diagnostic trail (not an error): confirms the write actually landed —
    // visible in System Logs if a coach's plan ever again appears unchanged.
    await logError({
      type: "SUBSCRIPTION_ERROR",
      severity: "info",
      message: "Subscription activated",
      userId: adminId,
      coachId,
      route: "/admin/coaches",
      action: "activateSubscription",
      context: { coachId, planId: input.planId, before: result.before, after: result.after },
    });
    revalidatePath("/admin/coaches");
    revalidatePath("/admin");
    revalidatePath("/coach/subscription");
    revalidatePath("/coach");
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

/* ---- Danger zone: reset default plans ---- */

export async function resetPlansAction(): Promise<ActionResult<ResetPlansResult>> {
  return runAction(async () => {
    const { adminId } = await getAdminCtx();
    let result: ResetPlansResult;
    try {
      result = await resetPlans();
    } catch (error) {
      await logError(
        {
          type: "ADMIN_RESET_PLANS",
          severity: "critical",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: adminId,
          route: "/admin/system/plans-reset",
          action: "resetPlans",
        },
        error,
      );
      throw error;
    }
    await logError({
      type: "ADMIN_RESET_PLANS",
      severity: "critical",
      message: "Super admin reset the default subscription plans",
      userId: adminId,
      route: "/admin/system/plans-reset",
      action: "resetPlans",
      context: { ...result },
    });
    revalidatePath("/admin/plans");
    revalidatePath("/admin/system/plans-reset");
    revalidatePath("/admin");
    return ok(result);
  });
}

/* ---- Repair legacy plans missing durationMonths ---- */

export async function repairPlanDurationAction(): Promise<ActionResult<RepairPlanDurationResult>> {
  return runAction(async () => {
    const { adminId } = await getAdminCtx();
    let result: RepairPlanDurationResult;
    try {
      result = await repairPlanDuration();
    } catch (error) {
      await logError(
        {
          type: "ADMIN_REPAIR_PLAN_DURATION",
          severity: "info",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: adminId,
          route: "/admin/system/repair-plan-duration",
          action: "repairPlanDuration",
        },
        error,
      );
      throw error;
    }
    await logError({
      type: "ADMIN_REPAIR_PLAN_DURATION",
      severity: "info",
      message: "Super admin repaired legacy plans missing durationMonths",
      userId: adminId,
      route: "/admin/system/repair-plan-duration",
      action: "repairPlanDuration",
      context: { ...result },
    });
    revalidatePath("/admin/plans");
    revalidatePath("/admin/system/repair-plan-duration");
    revalidatePath("/admin/coaches");
    return ok(result);
  });
}
