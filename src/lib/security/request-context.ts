import { headers } from "next/headers";

/**
 * Best-effort client IP from proxy headers (Vercel/other CDNs set
 * x-forwarded-for). Used as the rate-limit identifier for unauthenticated
 * endpoints. Falls back to a constant so a missing header degrades to a
 * shared global bucket rather than throwing.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Cross-site-request protection for non-Server-Action route handlers: verifies
 * the request Origin/Referer matches an allowed host. Returns true when the
 * request is same-origin (or origin can't be spoofed cross-site). Server
 * Actions already have built-in CSRF protection; this is for plain routes.
 */
export async function isSameOrigin(req: Request): Promise<boolean> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!host) return false;

  // Non-CORS same-origin requests (and some same-origin fetches) may omit
  // Origin; fall back to Referer, then to Sec-Fetch-Site when present.
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  const secFetchSite = req.headers.get("sec-fetch-site");
  // Browsers set this automatically; "same-origin"/"none" are safe.
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  // No origin signal at all → treat as untrusted.
  return false;
}
