/**
 * Admin password scheme designed for the Cloudflare Workers FREE plan
 * (10 ms CPU per request):
 *
 *   browser:  proof = PBKDF2-SHA256(password, salt = email, 600 000 iterations)
 *   server:   stored = HMAC-SHA256(pepper, proof)   ← microseconds of CPU
 *
 * The slow, brute-force-resistant work happens in the browser; the server
 * only stores a keyed hash of the proof. An attacker who steals the database
 * also needs the secret pepper, and even with it must pay 600k PBKDF2
 * iterations per password guess — the same cost as server-side PBKDF2.
 * The plain password never leaves the browser.
 *
 * Works in browsers, Workers and Node (Web Crypto only).
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PBKDF2_ITERATIONS = 600_000;

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (password.length > 256) return "Le mot de passe est trop long.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return "Utilisez au moins trois types : minuscules, majuscules, chiffres, symboles.";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic per-account salt (no lookup needed, so no account enumeration). */
function saltFor(email: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`la-badira/admin-password/v1:${normalizeEmail(email)}`);
}

export async function derivePasswordProof(email: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltFor(email), iterations: PBKDF2_ITERATIONS }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isPasswordProof(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
