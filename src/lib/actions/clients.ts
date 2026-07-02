"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getCoachAreaWriteCtxFor } from "./guards";
import { canManageClients } from "@/lib/permissions/team";
import { runAction, ok, fail, type ActionResult } from "./result";
import {
  clientCreateSchema,
  clientUpdateSchema,
  type ClientCreateInput,
  type ClientUpdateInput,
} from "@/lib/validations/client";
import * as clients from "@/lib/services/clients";
import type { GeneratedCredentials } from "@/lib/services/clients";

export async function createClientAction(
  input: ClientCreateInput,
): Promise<ActionResult<{ clientId: string; credentials: GeneratedCredentials }>> {
  return runAction(async () => {
    const parsed = clientCreateSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor(canManageClients);
    const res = await clients.createClient(coachId, parsed.data);
    revalidatePath("/coach/clients");
    revalidatePath("/coach");
    return ok(res);
  });
}

export async function updateClientAction(
  clientId: string,
  input: ClientUpdateInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = clientUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId } = await getCoachAreaWriteCtxFor(canManageClients);
    const okUpdate = await clients.updateClient(coachId, clientId, parsed.data);
    if (!okUpdate) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/clients");
    revalidatePath(`/coach/clients/${clientId}`);
    return ok();
  });
}

export async function archiveClientAction(clientId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canManageClients);
    await clients.archiveClient(coachId, clientId);
    revalidatePath("/coach/clients");
    return ok();
  });
}

export async function resetClientPasswordAction(
  clientId: string,
): Promise<ActionResult<{ password: string }>> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canManageClients);
    const session = await auth();
    const coachName = session?.user?.name ?? session?.user?.username ?? "Coach";
    const res = await clients.resetClientPassword(coachId, coachName, clientId);
    if (!res) return fail("غير موجود", "NOT_FOUND");
    return ok(res);
  });
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachAreaWriteCtxFor(canManageClients);
    const deleted = await clients.deleteClient(coachId, clientId);
    if (!deleted) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/clients");
    revalidatePath("/coach");
    return ok();
  });
}
