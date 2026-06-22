import { PermissionError } from "@/lib/permissions";

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
    const err = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      return fail("DUPLICATE", "DUPLICATE", field);
    }
    console.error("[action error]", e);
    return fail("حدث خطأ في الخادم", "SERVER_ERROR");
  }
}
