/** ISO date helpers working on `YYYY-MM-DD` strings in UTC (no timezone drift). */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

export function todayIso(now: Date = new Date(), timeZone = "Africa/Tunis"): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseIsoDate(checkIn);
  const b = parseIsoDate(checkOut);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDaysIso(value: string, days: number): string {
  const d = parseIsoDate(value);
  if (!d) return value;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const intlLocale = { fr: "fr-FR", en: "en-GB", ar: "ar-TN" } as const;

export function formatDate(value: string | Date, locale: "fr" | "en" | "ar", style: "long" | "medium" = "long"): string {
  const d = typeof value === "string" ? parseIsoDate(value) ?? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: style,
    timeZone: typeof value === "string" && ISO_DATE.test(value) ? "UTC" : "Africa/Tunis",
    ...(locale === "ar" ? { numberingSystem: "latn" } : {}),
  }).format(d);
}
