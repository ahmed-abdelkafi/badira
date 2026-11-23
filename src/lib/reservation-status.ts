export const reservationStatuses = ["pending", "confirmed", "declined", "cancelled", "completed"] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

/**
 * Allowed transitions. A request only becomes a booking when an authorised
 * administrator moves it from `pending` to `confirmed`.
 */
const transitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  declined: [],
  cancelled: [],
  completed: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return transitions[from].includes(to);
}

export function nextStatuses(from: ReservationStatus): readonly ReservationStatus[] {
  return transitions[from];
}

export function isFinal(status: ReservationStatus): boolean {
  return transitions[status].length === 0;
}
