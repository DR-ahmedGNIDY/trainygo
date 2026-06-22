import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/constants";

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };

export const LOCALE_COOKIE = "trainygo_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
