import type { Locale } from "@/i18n/config";

/** A string translated into the supported locales. Missing keys fall back. */
export type Localized = Partial<Record<Locale, string>>;

const fallbacks: Record<Locale, Locale[]> = {
  fr: ["fr", "en", "ar"],
  en: ["en", "fr", "ar"],
  ar: ["ar", "fr", "en"],
};

/** Resolve a localized value with fallback (ar → fr → en, en → fr, fr → en). */
export function t(value: Localized | null | undefined, locale: Locale): string {
  if (!value) return "";
  for (const l of fallbacks[locale]) {
    const v = value[l];
    if (v && v.trim()) return v;
  }
  return "";
}

/** True when the value has content in the requested locale itself (no fallback). */
export function hasOwn(value: Localized | null | undefined, locale: Locale): boolean {
  return !!value?.[locale]?.trim();
}

export function isEmptyLocalized(value: Localized | null | undefined): boolean {
  return !value || Object.values(value).every((v) => !v || !v.trim());
}
