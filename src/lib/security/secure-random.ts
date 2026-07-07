import { randomInt } from "crypto";

/**
 * Cryptographically secure random helpers. Server-only (uses node:crypto).
 * Use these for anything security-sensitive — account passwords, generated
 * usernames, one-time credentials — never Math.random().
 */

// Ambiguous characters (0/O, 1/I/l) removed so generated credentials are easy
// to read aloud / copy by a human.
const DEFAULT_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A cryptographically secure random string of `length` chars from `alphabet`. */
export function secureRandomString(length: number, alphabet = DEFAULT_ALPHABET): string {
  if (length <= 0) return "";
  let out = "";
  for (let i = 0; i < length; i++) {
    // randomInt is unbiased (rejection sampling) — unlike `% n` on random bytes.
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}

/** A secure numeric integer in [min, max). */
export function secureRandomInt(min: number, max: number): number {
  return randomInt(min, max);
}
