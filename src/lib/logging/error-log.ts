import { createHash } from "crypto";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { ErrorLog, type ErrorLogSeverity, type ErrorLogType } from "@/models/ErrorLog";
import pkg from "../../../package.json";

export interface LogErrorInput {
  type: ErrorLogType;
  message: string;
  stack?: string;
  code?: string;
  severity?: ErrorLogSeverity;
  coachId?: string;
  userId?: string;
  email?: string;
  route?: string;
  action?: string;
  context?: Record<string, unknown>;
}

/** Crude mobile/desktop split from the User-Agent string. */
function deviceFromUserAgent(ua: string): string {
  return /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
}

/** Groups recurring errors: same message + stack head + action collapse to one fingerprint. */
function computeFingerprint(input: { message: string; stack?: string; action?: string }): string {
  const stackHead = (input.stack ?? "").split("\n").slice(0, 2).join("\n");
  const basis = `${input.action ?? ""}|${input.message}|${stackHead}`;
  return createHash("sha1").update(basis).digest("hex");
}

/** Keys whose values must never be persisted to the log store, even inside `context`. */
const SENSITIVE_KEY_RE =
  /pass(word)?|secret|token|api[-_]?key|authorization|cookie|creditcard|cvv|ssn|paymentreference|otp/i;

/**
 * Recursively redacts values under sensitive-looking keys so credentials /
 * tokens / payment references never land in the ErrorLog collection. Depth- and
 * breadth-bounded to stay cheap.
 */
function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactSensitive(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY_RE.test(k) ? "[redacted]" : redactSensitive(v, depth + 1);
  }
  return out;
}

const LOGGED = Symbol("errorLogged");

/** Marks an error as already recorded via logError(), so runAction's generic safety net doesn't log it a second time under type UNKNOWN. */
export function markLogged(error: unknown): void {
  if (error && typeof error === "object") {
    (error as Record<symbol, boolean>)[LOGGED] = true;
  }
}

/** True if markLogged() was already called for this error. */
export function wasLogged(error: unknown): boolean {
  return !!(error && typeof error === "object" && (error as Record<symbol, boolean>)[LOGGED]);
}

/**
 * Persists an error to MongoDB for later review in the Super Admin "System
 * Logs" page. Best-effort only: never throws, and a failure here must never
 * fail the caller's original request. Browser/device/IP/environment/version
 * are extracted automatically — callers don't need to pass them.
 */
export async function logError(input: LogErrorInput, sourceError?: unknown): Promise<void> {
  if (sourceError !== undefined) markLogged(sourceError);
  try {
    let browser: string | undefined;
    let device: string | undefined;
    let ipAddress: string | undefined;
    try {
      const h = await headers();
      const ua = h.get("user-agent") ?? undefined;
      browser = ua;
      device = ua ? deviceFromUserAgent(ua) : undefined;
      ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    } catch {
      // headers() is only available inside a request scope; ignore otherwise.
    }

    await connectToDatabase();
    const fingerprint = computeFingerprint(input);
    const now = new Date();
    // Same fingerprint = same recurring error: bump count/lastOccurredAt on
    // the existing document instead of creating a duplicate row per occurrence.
    await ErrorLog.findOneAndUpdate(
      { fingerprint },
      {
        $set: {
          type: input.type,
          severity: input.severity ?? "error",
          message: input.message?.slice(0, 2000) ?? "Unknown error",
          stack: input.stack?.slice(0, 8000),
          code: input.code,
          coachId: input.coachId,
          userId: input.userId,
          email: input.email,
          route: input.route,
          action: input.action,
          context: input.context ? (redactSensitive(input.context) as Record<string, unknown>) : undefined,
          environment: (process.env.NODE_ENV as "production" | "development") ?? "development",
          version: pkg.version ?? process.env.NEXT_PUBLIC_APP_VERSION,
          browser,
          device,
          ipAddress,
          lastOccurredAt: now,
        },
        $setOnInsert: { fingerprint, resolved: false },
        $inc: { count: 1 },
      },
      { upsert: true },
    );
  } catch (loggingError) {
    console.error("Error logger failed", loggingError);
  }
}
