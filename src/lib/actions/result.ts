import type { Session } from "next-auth";
import { PermissionError } from "@/lib/permissions";
import { ClientLimitError } from "@/lib/services/clients";
import { auth } from "@/lib/auth";
import { logError, wasLogged } from "@/lib/logging/error-log";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string; field?: string };

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  code?: string,
  field?: string,
): ActionResult<never> {
  return { ok: false, error, code, field };
}

/**
 * Wrap a server-action body so thrown PermissionErrors (and Mongo duplicate-key
 * errors) become typed results instead of crashing the request.
 */
export async function runAction<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e: unknown) {
    if (e instanceof PermissionError) {
      return fail(e.message, e.code);
    }
    if (e instanceof ClientLimitError) {
      return fail(e.message, e.code);
    }
    const err = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      return fail("DUPLICATE", "DUPLICATE", field);
    }
    console.error("[action error]", e);
    // Safety net: persist any exception not already logged richly by the
    // caller, so it's never lost behind the generic message below.
    if (!wasLogged(e)) {
      const error = e instanceof Error ? e : new Error(String(e));
      let session: Session | null = null;
      try {
        session = await auth();
      } catch {
        // auth() requires a request scope; ignore if called outside one.
      }
      await logError({
        type: "UNKNOWN",
        message: error.message,
        stack: error.stack,
        userId: session?.user?.id,
        coachId: session?.user?.role === "coach" ? session.user.id : undefined,
        email: session?.user?.email ?? undefined,
      });
    }
    return fail("حدث خطأ في الخادم", "SERVER_ERROR");
  }
}
