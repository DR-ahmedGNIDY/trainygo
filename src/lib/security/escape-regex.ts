/**
 * Escapes a user-supplied string so it can be safely embedded in a `new RegExp`
 * without regex-injection / ReDoS. Every user-driven search that builds a
 * MongoDB `$regex` must run its input through this first.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convenience: a case-insensitive RegExp built from safely-escaped user input. */
export function safeSearchRegex(input: string): RegExp {
  return new RegExp(escapeRegex(input.trim()), "i");
}
