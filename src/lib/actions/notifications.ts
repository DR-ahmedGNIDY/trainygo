"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { runAction, ok, fail, type ActionResult } from "./result";
import { markAllRead } from "@/lib/services/notifications";

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return fail("Unauthorized", "UNAUTHORIZED");
    await markAllRead(session.user.id);
    revalidatePath("/admin/notifications");
    return ok();
  });
}
