export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const localeMeta: Record<Locale, { label: string; short: string; dir: "ltr" | "rtl"; hreflang: string; ogLocale: string }> = {
  fr: { label: "Français", short: "FR", dir: "ltr", hreflang: "fr", ogLocale: "fr_FR" },
  en: { label: "English", short: "EN", dir: "ltr", hreflang: "en", ogLocale: "en_GB" },
  ar: { label: "العربية", short: "ع", dir: "rtl", hreflang: "ar", ogLocale: "ar_TN" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
