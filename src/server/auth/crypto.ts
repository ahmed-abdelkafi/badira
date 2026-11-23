import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Keyed hash for high-entropy one-time codes (recovery codes ≈ 50 bits):
 * deterministic, so codes can be looked up by index (Workers CPU budget).
 */
export function hmacCode(value: string): string {
  return createHmac("sha256", encryptionKey()).update(`recovery:${value}`).digest("hex");
}

/**
 * Stored password verifier: HMAC-SHA256(pepper, proof), where `proof` is the
 * browser-side PBKDF2 result (see src/lib/password.ts). Microseconds of CPU,
 * so admin login fits the Workers Free plan's 10 ms budget.
 */
export function passwordVerifier(proof: string): string {
  return `v1$${createHmac("sha256", encryptionKey()).update(`password:${proof}`).digest("hex")}`;
}

export function checkPasswordVerifier(proof: string, stored: string): boolean {
  const expected = Buffer.from(stored.startsWith("v1$") ? stored.slice(3) : "", "hex");
  const actual = Buffer.from(passwordVerifier(proof).slice(3), "hex");
  return expected.length === actual.length && expected.length > 0 && timingSafeEqual(actual, expected);
}

function encryptionKey(): Buffer {
  const key = Buffer.from(env().TOTP_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) throw new Error("TOTP_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !ct) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
