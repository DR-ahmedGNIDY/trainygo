import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely (dedupes conflicting utilities).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random alphanumeric string (used for usernames / temp passwords).
 */
export function randomString(length: number, alphabet?: string): string {
  const chars =
    alphabet ?? "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Format a number with thousands separators, locale-aware.
 */
export function formatNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
    value,
  );
}

/**
 * Full "day month year hour:minute AM/PM" date-time, locale-aware (Arabic
 * month names with Latin digits in ar, English in en). e.g. "12 يوليو 2026 03:45 PM".
 */
export function formatFullDateTime(date: Date | string, locale: "ar" | "en" = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    numberingSystem: "latn",
  }).format(d);
}
