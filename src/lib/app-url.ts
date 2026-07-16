/**
 * The single source of truth for the platform's public origin.
 *
 * Every user-facing absolute URL we generate ourselves — login links pasted
 * into WhatsApp invitations, Open Graph / metadata, and any future email or
 * notification template — must be built from here, so the domain is changed in
 * one env var rather than hunted for across the codebase.
 *
 * `NEXT_PUBLIC_` so client components can build links too; Next inlines it at
 * build time, which means it must be read as a static member expression (never
 * destructured or indexed dynamically) for the replacement to happen.
 */
const FALLBACK_ORIGIN = "https://fitxnet.com";

/** Public origin, no trailing slash. Falls back to production if unset. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_ORIGIN).replace(/\/+$/, "");

/** Absolute URL for an app-relative path, e.g. appUrl("/login"). */
export function appUrl(path = "/"): string {
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
