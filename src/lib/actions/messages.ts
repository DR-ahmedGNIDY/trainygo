"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { runAction, ok, fail, type ActionResult } from "./result";
import * as messages from "@/lib/services/messages";
import type { Attachment } from "@/lib/services/messages";

async function ctx() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "coach" && session.user.role !== "client")) {
    throw new PermissionError("Forbidden", "FORBIDDEN");
  }
  return { userId: session.user.id, role: session.user.role as "coach" | "client" };
}

export async function sendMessageAction(
  conversationId: string,
  payload: { text?: string; attachments?: Attachment[] },
): Promise<ActionResult<{ id: string | null }>> {
  return runAction(async () => {
    const { userId, role } = await ctx();
    if (role === "client") {
      const { getClientAccessState } = await import("@/lib/services/subscription");
      const access = await getClientAccessState(userId);
      if (access.frozen) {
        const message =
          access.frozenReason === "frozen_by_coach"
            ? "تم تجميد اشتراكك مؤقتاً. يرجى التواصل مع المدرب."
            : access.frozenReason === "coach"
              ? "حسابك قيد التجميد حالياً نتيجة تجميد حساب المدرب الخاص بك."
              : "انتهى اشتراكك. يرجى التواصل مع مدربك لتجديده.";
        const code =
          access.frozenReason === "frozen_by_coach"
            ? "SUBSCRIPTION_FROZEN"
            : access.frozenReason === "coach"
              ? "COACH_FROZEN"
              : "CLIENT_EXPIRED";
        return fail(message, code);
      }
    }
    const id = await messages.sendMessage(conversationId, userId, role, payload);
    revalidatePath(role === "coach" ? "/coach/messages" : "/client/messages");
    return ok({ id });
  });
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { userId, role } = await ctx();
    await messages.markRead(conversationId, userId, role);
    return ok();
  });
}

export async function startConversationAction(clientId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await auth();
    if (session?.user?.role !== "coach") return fail("Forbidden", "FORBIDDEN");
    const convo = await messages.getOrCreateConversation(session.user.id, clientId);
    return ok({ id: convo._id.toString() });
  });
}
