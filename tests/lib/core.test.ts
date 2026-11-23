import { describe, expect, it } from "vitest";
import { canTransition, isFinal, nextStatuses } from "@/lib/reservation-status";
import { generateReservationReference, REFERENCE_PATTERN } from "@/lib/reference";
import { formatPhoneDisplay, toE164, waDigits } from "@/lib/phone";
import { buildWhatsAppUrl, defaultWhatsAppTemplates, renderWhatsAppTemplate } from "@/lib/whatsapp";
import { addDaysIso, nightsBetween, parseIsoDate } from "@/lib/dates";
import { t } from "@/lib/localized";
import { applyOverrides, flatten } from "@/i18n/flatten";
import fr from "@/i18n/dictionaries/fr";
import en from "@/i18n/dictionaries/en";
import ar from "@/i18n/dictionaries/ar";

describe("reservation status machine", () => {
  it("only lets a pending request become confirmed, declined or cancelled", () => {
    expect(nextStatuses("pending")).toEqual(["confirmed", "declined", "cancelled"]);
    expect(canTransition("pending", "completed")).toBe(false);
  });
  it("confirmed bookings can be completed or cancelled, never declined", () => {
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "declined")).toBe(false);
  });
  it("declined, cancelled and completed are final", () => {
    for (const s of ["declined", "cancelled", "completed"] as const) {
      expect(isFinal(s)).toBe(true);
      expect(canTransition(s, "confirmed")).toBe(false);
    }
  });
});

describe("reservation reference", () => {
  it("matches LB-YYMM-XXXXXX with an unambiguous alphabet", () => {
    const ref = generateReservationReference(new Date("2026-11-23T10:00:00Z"));
    expect(ref).toMatch(REFERENCE_PATTERN);
    expect(ref.startsWith("LB-2611-")).toBe(true);
    expect(ref.slice(8)).not.toMatch(/[01OIL]/);
  });
  it("is random enough not to collide in a large sample", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateReservationReference()));
    expect(set.size).toBe(5000);
  });
});

describe("phone normalisation (E.164)", () => {
  it("drops the national trunk 0", () => {
    expect(toE164("+33", "06 12 34 56 78")).toBe("+33612345678");
    expect(toE164("+44", "07700 900123")).toBe("+447700900123");
  });
  it("keeps Tunisian 8-digit numbers and Italian leading zeros", () => {
    expect(toE164("+216", "70 018 180")).toBe("+21670018180");
    expect(toE164("+39", "06 1234 5678")).toBe("+390612345678");
  });
  it("accepts an international number typed in the national field", () => {
    expect(toE164("+216", "+216 70 018 180")).toBe("+21670018180");
    expect(toE164("+216", "00216 70018180")).toBe("+21670018180");
    expect(toE164("+216", "+33 6 12 34 56 78")).toBeNull();
  });
  it("rejects implausible numbers", () => {
    expect(toE164("+216", "123")).toBeNull();
    expect(toE164("216", "70018180")).toBeNull();
    expect(toE164("+1", "1".repeat(20))).toBeNull();
  });
  it("formats for display and for wa.me", () => {
    expect(waDigits("+21670018180")).toBe("21670018180");
    expect(formatPhoneDisplay("+21670018180")).toBe("+216 70 01 81 80");
  });
});

describe("WhatsApp click-to-chat", () => {
  const ctx = {
    firstName: "Amira",
    lastName: "Ben Salah",
    reference: "LB-2611-ABCDEF",
    checkIn: "2027-06-10",
    checkOut: "2027-06-14",
    categoryLabel: "Nour Suite",
    guests: 2,
  };

  it("renders the French acceptance template with all placeholders", () => {
    const msg = renderWhatsAppTemplate(defaultWhatsAppTemplates.accept.fr, ctx, "fr");
    expect(msg).toContain("Bonjour Amira Ben Salah");
    expect(msg).toContain("LB-2611-ABCDEF");
    expect(msg).toContain("10 juin 2027");
    expect(msg).toContain("14 juin 2027");
    expect(msg).not.toMatch(/\[[A-Z_]+\]/);
  });

  it("renders English and Arabic templates without leftover placeholders", () => {
    for (const locale of ["en", "ar"] as const) {
      for (const kind of ["accept", "decline", "general"] as const) {
        const msg = renderWhatsAppTemplate(defaultWhatsAppTemplates[kind][locale], ctx, locale);
        expect(msg).toContain("LB-2611-ABCDEF");
        expect(msg).not.toMatch(/\[[A-Z_]+\]/);
      }
    }
  });

  it("builds a wa.me URL with digits only and an encoded message", () => {
    const url = buildWhatsAppUrl("+216 70 018 180", "Bonjour & bienvenue ? #1");
    expect(url).toBe("https://wa.me/21670018180?text=Bonjour%20%26%20bienvenue%20%3F%20%231");
    expect(new URL(url).searchParams.get("text")).toBe("Bonjour & bienvenue ? #1");
  });

  it("encodes Arabic text so it round-trips", () => {
    const msg = renderWhatsAppTemplate(defaultWhatsAppTemplates.decline.ar, ctx, "ar");
    expect(new URL(buildWhatsAppUrl("+21692603470", msg)).searchParams.get("text")).toBe(msg);
  });

  it("opens a plain chat when no message is given", () => {
    expect(buildWhatsAppUrl("+21692603470")).toBe("https://wa.me/21692603470");
  });
});

describe("dates", () => {
  it("parses only real ISO dates", () => {
    expect(parseIsoDate("2027-02-29")).toBeNull();
    expect(parseIsoDate("2028-02-29")).not.toBeNull();
    expect(parseIsoDate("29/02/2028")).toBeNull();
  });
  it("counts nights across months", () => {
    expect(nightsBetween("2027-01-30", "2027-02-02")).toBe(3);
    expect(addDaysIso("2027-12-31", 1)).toBe("2028-01-01");
  });
});

describe("i18n", () => {
  it("falls back ar → fr → en for localized content", () => {
    expect(t({ fr: "Bonjour", en: "Hello" }, "ar")).toBe("Bonjour");
    expect(t({ en: "Hello" }, "fr")).toBe("Hello");
    expect(t({ ar: "  " , en: "Hello" }, "ar")).toBe("Hello");
  });
  it("EN and AR dictionaries define exactly the same keys as FR", () => {
    const keys = Object.keys(flatten(fr)).sort();
    expect(Object.keys(flatten(en)).sort()).toEqual(keys);
    expect(Object.keys(flatten(ar)).sort()).toEqual(keys);
  });
  it("applies admin overrides to known keys only, without mutating the base", () => {
    const out = applyOverrides(fr, { "nav.suites": "Nos suites", "nope.key": "x", "nav.spa": "   " });
    expect(out.nav.suites).toBe("Nos suites");
    expect(out.nav.spa).toBe(fr.nav.spa);
    expect(fr.nav.suites).toBe("Suites");
    expect((out as unknown as Record<string, unknown>).nope).toBeUndefined();
  });
});
