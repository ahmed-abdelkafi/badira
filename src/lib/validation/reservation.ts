import { z } from "zod";
import { addDaysIso, nightsBetween, parseIsoDate, todayIso } from "@/lib/dates";
import { toE164 } from "@/lib/phone";
import { locales } from "@/i18n/config";

export const preferredCategoryValues = ["any", "standard", "legend", "fell", "yasmine", "nour"] as const;
export const MAX_NIGHTS = 60;
export const MAX_ADVANCE_DAYS = 730;

/** Error messages are i18n keys resolved by the form (`errors.<key>`). */
const isoDate = z.string().trim().refine((v) => parseIsoDate(v) !== null, "invalidDate");

const nameField = z
  .string()
  .trim()
  .min(1, "required")
  .max(80, "tooLong")
  .refine((v) => !/[<>{}\\]/.test(v), "invalidChars");

export function reservationRequestSchema(now: Date = new Date()) {
  const today = todayIso(now);
  return z
    .object({
      checkIn: isoDate,
      checkOut: isoDate,
      guests: z.coerce.number().int("invalidNumber").min(1, "guestsMin").max(20, "guestsMax"),
      rooms: z.coerce.number().int("invalidNumber").min(1, "roomsMin").max(10, "roomsMax"),
      preferredCategory: z
        .string()
        .trim()
        .refine(
          (v) => (preferredCategoryValues as readonly string[]).includes(v) || /^suite:[a-z0-9-]{1,80}$/.test(v),
          "invalidCategory",
        ),
      firstName: nameField,
      lastName: nameField,
      // Optional: the hotel replies on WhatsApp / phone.
      email: z.union([z.literal(""), z.string().trim().toLowerCase().max(254, "tooLong").pipe(z.email("invalidEmail"))]).default(""),
      dialCode: z.string().trim().regex(/^\+\d{1,4}$/, "invalidPhone"),
      phone: z.string().trim().min(4, "invalidPhone").max(25, "invalidPhone"),
      specialRequests: z
        .string()
        .trim()
        .max(2000, "tooLong")
        .optional()
        .transform((v) => (v ? v : undefined)),
      consent: z.literal(true, { error: "consentRequired" }),
      locale: z.enum(locales).default("fr"),
      /** Honeypot — must stay empty. */
      website: z.string().max(0, "bot").optional().default(""),
    })
    .superRefine((data, ctx) => {
      if (data.checkIn < today) ctx.addIssue({ code: "custom", path: ["checkIn"], message: "checkInPast" });
      if (data.checkIn > addDaysIso(today, MAX_ADVANCE_DAYS))
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: "checkInTooFar" });
      const nights = nightsBetween(data.checkIn, data.checkOut);
      if (nights < 1) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "checkOutBeforeCheckIn" });
      else if (nights > MAX_NIGHTS) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "stayTooLong" });
      if (data.rooms > data.guests) ctx.addIssue({ code: "custom", path: ["rooms"], message: "roomsExceedGuests" });
      if (!toE164(data.dialCode, data.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "invalidPhone" });
    })
    .transform((data) => ({ ...data, phoneE164: toE164(data.dialCode, data.phone)! }));
}

export type ReservationRequestInput = z.input<ReturnType<typeof reservationRequestSchema>>;
export type ReservationRequest = z.output<ReturnType<typeof reservationRequestSchema>>;

/** Convert FormData to a plain object understood by the schema. */
export function reservationFormToObject(form: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    checkIn: get("checkIn"),
    checkOut: get("checkOut"),
    guests: get("guests"),
    rooms: get("rooms") ?? "1",
    preferredCategory: get("preferredCategory") ?? "any",
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: (get("email") ?? "").trim(),
    dialCode: get("dialCode"),
    phone: get("phone"),
    specialRequests: get("specialRequests"),
    consent: get("consent") === "on" || get("consent") === "true",
    locale: get("locale"),
    website: get("website") ?? "",
  };
}

/** Flatten Zod issues to `{ field: errorKey }` (first error per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
