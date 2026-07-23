"use server";

import { revalidatePath } from "next/cache";
import { getCoachAreaWriteCtxFor } from "./guards";
import { canManageClients } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import {
  freezeSchema,
  renewSchema,
  cancelSchema,
  type FreezeInput,
  type RenewInput,
  type CancelInput,
} from "@/lib/validations/subscription-freeze";
import {
  freezeClient,
  resumeClient,
  renewClient,
  cancelClient,
  FreezeError,
} from "@/lib/services/subscription-freeze";

/**
 * Freeze a client's subscription. Gated by `canManageClients`, which grants
 * access to a coach, an academy manager, and an assistant coach (both presets
 * carry the permission) — but never a nutrition specialist or fitness coach,
 * who lack it. Ownership is enforced in the service layer.
 */
export async function freezeClientAction(
  clientId: string,
  input: FreezeInput,
): Promise<ActionResult<{ remainingDays: number }>> {
  return runAction(async () => {
    const parsed = freezeSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId, actingUserId } = await getCoachAreaWriteCtxFor(canManageClients);
    try {
      const res = await freezeClient(coachId, actingUserId, clientId, {
        reason: parsed.data.reason || undefined,
        notes: parsed.data.notes || undefined,
      });
      revalidatePath(`/coach/clients/${clientId}`);
      revalidatePath("/coach/clients");
      revalidatePath("/coach");
      return ok(res);
    } catch (e) {
      if (e instanceof FreezeError) return fail(e.message, e.code);
      throw e;
    }
  });
}

/** Resume a frozen client's subscription. Same permission gate as freeze. */
export async function resumeClientAction(
  clientId: string,
): Promise<ActionResult<{ endDate: string; remainingDays: number }>> {
  return runAction(async () => {
    const { coachId, actingUserId } = await getCoachAreaWriteCtxFor(canManageClients);
    try {
      const res = await resumeClient(coachId, actingUserId, clientId);
      revalidatePath(`/coach/clients/${clientId}`);
      revalidatePath("/coach/clients");
      revalidatePath("/coach");
      return ok({ endDate: res.endDate.toISOString(), remainingDays: res.remainingDays });
    } catch (e) {
      if (e instanceof FreezeError) return fail(e.message, e.code);
      throw e;
    }
  });
}

/** Renew (extend) a client's subscription by a number of months. Same permission gate. */
export async function renewClientAction(
  clientId: string,
  input: RenewInput,
): Promise<ActionResult<{ endDate: string }>> {
  return runAction(async () => {
    const parsed = renewSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId, actingUserId } = await getCoachAreaWriteCtxFor(canManageClients);
    try {
      const res = await renewClient(coachId, actingUserId, clientId, parsed.data.months);
      revalidatePath(`/coach/clients/${clientId}`);
      revalidatePath("/coach/clients");
      revalidatePath("/coach");
      return ok({ endDate: res.endDate.toISOString() });
    } catch (e) {
      if (e instanceof FreezeError) return fail(e.message, e.code);
      throw e;
    }
  });
}

/** Cancel (end) a client's subscription immediately. Same permission gate. */
export async function cancelClientAction(
  clientId: string,
  input: CancelInput = {},
): Promise<ActionResult<{ endDate: string }>> {
  return runAction(async () => {
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId, actingUserId } = await getCoachAreaWriteCtxFor(canManageClients);
    try {
      const res = await cancelClient(coachId, actingUserId, clientId, parsed.data.reason || undefined);
      revalidatePath(`/coach/clients/${clientId}`);
      revalidatePath("/coach/clients");
      revalidatePath("/coach");
      return ok({ endDate: res.endDate.toISOString() });
    } catch (e) {
      if (e instanceof FreezeError) return fail(e.message, e.code);
      throw e;
    }
  });
}
