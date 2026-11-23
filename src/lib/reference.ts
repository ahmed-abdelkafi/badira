import { randomInt } from "node:crypto";

/** Unambiguous alphabet: no 0/O, 1/I/L. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** e.g. LB-2611-7KQ4ZP — prefix, year+month, 6 random chars (~887M combinations / month). */
export function generateReservationReference(now: Date = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `LB-${yy}${mm}-${suffix}`;
}

export const REFERENCE_PATTERN = /^LB-\d{4}-[2-9A-HJKMNP-Z]{6}$/;
