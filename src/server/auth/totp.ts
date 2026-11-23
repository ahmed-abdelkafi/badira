import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { randomInt } from "node:crypto";

export const TOTP_ISSUER = "La Badira Admin";

export function newTotpSecret(): string {
  return generateSecret();
}

export function totpUri(secret: string, accountLabel: string): string {
  return generateURI({ issuer: TOTP_ISSUER, label: accountLabel, secret });
}

export async function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 1, width: 240 });
}

/**
 * Verify a 6-digit code. Accepts ±1 step (30 s) of clock drift and rejects any
 * time step at or before `lastUsedTimeStep` to prevent replay.
 * Returns the accepted time step, or null.
 */
export async function verifyTotp(secret: string, token: string, lastUsedTimeStep?: number | null): Promise<number | null> {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  try {
    const result = await verify({
      secret,
      token: clean,
      epochTolerance: 30,
      ...(lastUsedTimeStep != null ? { afterTimeStep: lastUsedTimeStep } : {}),
    });
    return result.valid && "timeStep" in result ? result.timeStep : null;
  } catch {
    return null;
  }
}

/** 10 recovery codes formatted xxxxx-xxxxx (lowercase base32-ish). */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^(.{5})(.{5})$/, "$1-$2");
}
