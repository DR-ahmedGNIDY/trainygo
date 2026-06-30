"use server";

import { revalidatePath } from "next/cache";
import { getAdminCtx } from "./guards";
import { runAction, ok, type ActionResult } from "./result";
import * as errorLogs from "@/lib/services/error-logs";

export async function markErrorLogResolvedAction(id: string, resolved: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { adminId } = await getAdminCtx();
    await errorLogs.markErrorLogResolved(id, adminId, resolved);
    revalidatePath("/admin/system-logs");
    return ok();
  });
}

export async function addErrorLogNoteAction(id: string, notes: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await errorLogs.addErrorLogNote(id, notes);
    revalidatePath("/admin/system-logs");
    return ok();
  });
}

export async function deleteErrorLogAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getAdminCtx();
    await errorLogs.deleteErrorLog(id);
    revalidatePath("/admin/system-logs");
    return ok();
  });
}
