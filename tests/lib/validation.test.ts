import { describe, expect, it } from "vitest";
import { fieldErrors, reservationFormToObject, reservationRequestSchema } from "@/lib/validation/reservation";

const NOW = new Date("2026-11-23T10:00:00Z");

function valid(overrides: Record<string, unknown> = {}) {
  return {
    checkIn: "2026-12-10",
    checkOut: "2026-12-14",
    guests: "2",
    rooms: "1",
    preferredCategory: "any",
    firstName: "Amira",
    lastName: "Ben Salah",
    email: "Amira@Example.com ",
    dialCode: "+216",
    phone: "92 000 000",
    specialRequests: "",
    consent: true,
    locale: "fr",
    website: "",
    ...overrides,
  };
}

const parse = (o: Record<string, unknown>) => reservationRequestSchema(NOW).safeParse(o);
const errs = (o: Record<string, unknown>) => {
  const r = parse(o);
  return r.success ? {} : fieldErrors(r.error);
};

describe("reservation request validation", () => {
  it("accepts a valid request and normalises email and phone", () => {
    const r = parse(valid());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("amira@example.com");
      expect(r.data.phoneE164).toBe("+21692000000");
      expect(r.data.guests).toBe(2);
      expect(r.data.specialRequests).toBeUndefined();
    }
  });

  it("rejects check-in in the past and check-out before check-in", () => {
    expect(errs(valid({ checkIn: "2026-11-01" })).checkIn).toBe("checkInPast");
    expect(errs(valid({ checkOut: "2026-12-10" })).checkOut).toBe("checkOutBeforeCheckIn");
  });

  it("allows same-day check-in (Tunis time) but not more than 2 years ahead or 60 nights", () => {
    expect(parse(valid({ checkIn: "2026-11-23", checkOut: "2026-11-24" })).success).toBe(true);
    expect(errs(valid({ checkIn: "2029-01-10", checkOut: "2029-01-12" })).checkIn).toBe("checkInTooFar");
    expect(errs(valid({ checkOut: "2027-03-01" })).checkOut).toBe("stayTooLong");
  });

  it("validates guests, rooms and their relation", () => {
    expect(errs(valid({ guests: "0" })).guests).toBe("guestsMin");
    expect(errs(valid({ guests: "21" })).guests).toBe("guestsMax");
    expect(errs(valid({ guests: "1", rooms: "2" })).rooms).toBe("roomsExceedGuests");
    expect(errs(valid({ guests: "2.5" })).guests).toBe("invalidNumber");
  });

  it("requires names, a valid email, phone and explicit consent", () => {
    const e = errs(valid({ firstName: " ", email: "nope", phone: "12", consent: false }));
    expect(e.firstName).toBe("required");
    expect(e.email).toBe("invalidEmail");
    expect(parse(valid({ email: "" })).success).toBe(true);
    expect(e.phone).toBe("invalidPhone");
    expect(e.consent).toBe("consentRequired");
  });

  it("rejects markup-like characters in names", () => {
    expect(errs(valid({ lastName: "<script>" })).lastName).toBe("invalidChars");
  });

  it("only accepts known categories or suite:<slug>", () => {
    expect(parse(valid({ preferredCategory: "legend" })).success).toBe(true);
    expect(parse(valid({ preferredCategory: "suite:paul-klee" })).success).toBe(true);
    expect(errs(valid({ preferredCategory: "penthouse" })).preferredCategory).toBe("invalidCategory");
    expect(errs(valid({ preferredCategory: "suite:../../etc" })).preferredCategory).toBe("invalidCategory");
  });

  it("flags the honeypot", () => {
    expect(errs(valid({ website: "http://spam" })).website).toBe("bot");
  });

  it("maps FormData (checkbox 'on') to the schema input", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(valid({ consent: undefined }))) if (v !== undefined) fd.set(k, String(v));
    fd.set("consent", "on");
    expect(parse(reservationFormToObject(fd)).success).toBe(true);
    fd.delete("consent");
    expect(errs(reservationFormToObject(fd)).consent).toBe("consentRequired");
  });
});
