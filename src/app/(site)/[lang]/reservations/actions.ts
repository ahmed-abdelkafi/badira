"use server";

import { after } from "next/server";
import { reservationFormToObject, reservationRequestSchema, fieldErrors } from "@/lib/validation/reservation";
import { createReservationRequest, notifyNewReservation, ReservationError } from "@/server/services/reservations";
import { clientIp } from "@/server/auth/dal";

export type ReservationFormState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Record<string, string>; formError?: string }
  | {
      status: "success";
      reference: string;
      summary: { checkIn: string; checkOut: string; guests: number; rooms: number; preferredCategory: string; name: string; email: string };
    };

/**
 * Public reservation REQUEST. Validates, stores as `pending`, and defers
 * emails + push notifications until after the response (`after()`).
 * The guest is told explicitly that this is not a confirmed booking.
 */
export async function submitReservation(_prev: ReservationFormState, formData: FormData): Promise<ReservationFormState> {
  const parsed = reservationRequestSchema().safeParse(reservationFormToObject(formData));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Honeypot filled → generic refusal, no detail.
    if (errors.website) return { status: "error", fieldErrors: {}, formError: "bot" };
    return { status: "error", fieldErrors: errors, formError: "form" };
  }
  const input = parsed.data;
  try {
    const created = await createReservationRequest(input, await clientIp());
    after(async () => {
      try {
        await notifyNewReservation(created);
      } catch (err) {
        console.error("[reservations] post-submit notification failed:", (err as Error).message);
      }
    });
    return {
      status: "success",
      reference: created.reference,
      summary: {
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        rooms: input.rooms,
        preferredCategory: input.preferredCategory,
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
      },
    };
  } catch (err) {
    if (err instanceof ReservationError) {
      if (err.code === "rate_limited") return { status: "error", fieldErrors: {}, formError: "rateLimited" };
      if (err.code === "invalid_suite") return { status: "error", fieldErrors: { preferredCategory: "invalidSuite" }, formError: "form" };
    }
    console.error("[reservations] submit failed:", (err as Error).message);
    return { status: "error", fieldErrors: {}, formError: "generic" };
  }
}
