/** Dial codes offered in the reservation form (most relevant markets first). */
export const dialCodes = [
  { iso: "TN", code: "+216", name: "Tunisie / Tunisia" },
  { iso: "FR", code: "+33", name: "France" },
  { iso: "DE", code: "+49", name: "Deutschland" },
  { iso: "IT", code: "+39", name: "Italia" },
  { iso: "GB", code: "+44", name: "United Kingdom" },
  { iso: "BE", code: "+32", name: "Belgique" },
  { iso: "CH", code: "+41", name: "Suisse" },
  { iso: "ES", code: "+34", name: "España" },
  { iso: "NL", code: "+31", name: "Nederland" },
  { iso: "LU", code: "+352", name: "Luxembourg" },
  { iso: "AT", code: "+43", name: "Österreich" },
  { iso: "PT", code: "+351", name: "Portugal" },
  { iso: "IE", code: "+353", name: "Ireland" },
  { iso: "SE", code: "+46", name: "Sverige" },
  { iso: "NO", code: "+47", name: "Norge" },
  { iso: "DK", code: "+45", name: "Danmark" },
  { iso: "PL", code: "+48", name: "Polska" },
  { iso: "CZ", code: "+420", name: "Česko" },
  { iso: "RU", code: "+7", name: "Россия" },
  { iso: "DZ", code: "+213", name: "Algérie / الجزائر" },
  { iso: "LY", code: "+218", name: "Libye / ليبيا" },
  { iso: "MA", code: "+212", name: "Maroc / المغرب" },
  { iso: "EG", code: "+20", name: "Égypte / مصر" },
  { iso: "SA", code: "+966", name: "السعودية" },
  { iso: "AE", code: "+971", name: "الإمارات" },
  { iso: "QA", code: "+974", name: "قطر" },
  { iso: "KW", code: "+965", name: "الكويت" },
  { iso: "LB", code: "+961", name: "لبنان" },
  { iso: "TR", code: "+90", name: "Türkiye" },
  { iso: "US", code: "+1", name: "United States / Canada" },
  { iso: "BR", code: "+55", name: "Brasil" },
  { iso: "CN", code: "+86", name: "中国" },
  { iso: "JP", code: "+81", name: "日本" },
  { iso: "IN", code: "+91", name: "India" },
  { iso: "AU", code: "+61", name: "Australia" },
] as const;

/** Countries where the leading 0 of a national number is part of the number. */
const KEEP_LEADING_ZERO = new Set(["+39"]);

/**
 * Normalise a dial code + national number into E.164 (`+21670018180`).
 * Returns null when the result is not a plausible E.164 number.
 */
export function toE164(dialCode: string, national: string): string | null {
  const code = dialCode.trim();
  if (!/^\+\d{1,4}$/.test(code)) return null;
  let digits = national.replace(/[^\d]/g, "");
  // The guest may have typed the full international number in the national field.
  const codeDigits = code.slice(1);
  if (national.trim().startsWith("+")) {
    if (!digits.startsWith(codeDigits)) return null;
    digits = digits.slice(codeDigits.length);
  } else if (national.trim().startsWith("00" + codeDigits)) {
    digits = digits.slice(2 + codeDigits.length);
  }
  if (!KEEP_LEADING_ZERO.has(code)) digits = digits.replace(/^0/, "");
  const full = codeDigits + digits;
  if (digits.length < 6 || full.length > 15) return null;
  return `+${full}`;
}

/** Digits only, as required by wa.me links. */
export function waDigits(e164: string): string {
  return e164.replace(/[^\d]/g, "");
}

export function formatPhoneDisplay(e164: string): string {
  const match = dialCodes
    .map((d) => d.code)
    .sort((a, b) => b.length - a.length)
    .find((c) => e164.startsWith(c));
  if (!match) return e164;
  const rest = e164.slice(match.length).replace(/(\d{2})(?=\d)/g, "$1 ");
  return `${match} ${rest}`.trim();
}
