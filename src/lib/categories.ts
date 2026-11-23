import type { Locale } from "@/i18n/config";

/** Labels for preferred-category values. Suite/brand names are never translated. */
const labels: Record<string, Record<Locale, string>> = {
  any: { fr: "Sans préférence", en: "No preference", ar: "بدون تفضيل" },
  standard: { fr: "Suites Standard", en: "Standard Suites", ar: "الأجنحة القياسية" },
  legend: { fr: "Suites Légende", en: "Legend Suites", ar: "أجنحة الأساطير" },
  fell: { fr: "Suites Fell", en: "Fell Suites", ar: "أجنحة Fell" },
  yasmine: { fr: "Suite Yasmine", en: "Yasmine Suite", ar: "جناح Yasmine" },
  nour: { fr: "Suite Nour", en: "Nour Suite", ar: "جناح Nour" },
};

export function categoryLabel(value: string, locale: Locale, suiteNames?: Record<string, string>): string {
  if (value.startsWith("suite:")) {
    const slug = value.slice(6);
    return suiteNames?.[slug] ?? slug;
  }
  return labels[value]?.[locale] ?? value;
}

export const collectionLabels: Record<"standard" | "legend", Record<Locale, string>> = {
  standard: labels.standard,
  legend: labels.legend,
};
