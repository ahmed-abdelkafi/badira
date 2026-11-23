import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { generate } from "otplib";
import { db, schema } from "@/server/db";
import { checkPasswordVerifier, decrypt, encrypt, passwordVerifier } from "@/server/auth/crypto";
import { derivePasswordProof, isPasswordProof, passwordPolicyError } from "@/lib/password";
import { makeAdmin, proofFor } from "../helpers/users";
import {
  authenticatePassword,
  beginTotpSetup,
  changePassword,
  confirmTotpSetup,
  createPasswordResetToken,
  getResetTokenEmail,
  createSession,
  LOGIN_MAX_FAILURES_PER_EMAIL,
  resetPasswordWithToken,
  resetTwoFactor,
  revokeSession,
  validateSession,
  verifySecondFactor,
} from "@/server/auth/service";
import { hasPermission } from "@/server/auth/permissions";
import { resetDb } from "../helpers/db";

const PASSWORD = "Correct-Horse-42";

async function makeUser(role = "owner", email = "owner@test.local") {
  return makeAdmin(email, role, PASSWORD, "Test Owner");
}
const P = (password = PASSWORD, email = "owner@test.local") => proofFor(email, password);

async function currentCode(userId: string, which: "secretEnc" | "pendingSecretEnc" = "secretEnc", offsetSeconds = 0) {
  const [row] = await db().select().from(schema.twoFactorAuth).where(eq(schema.twoFactorAuth.userId, userId));
  const secret = decrypt(row[which]!);
  return generate({ secret, epoch: Math.floor(Date.now() / 1000) + offsetSeconds });
}

beforeEach(resetDb);

describe("password scheme (browser PBKDF2 proof + server HMAC — Workers Free friendly)", () => {
  it("derives a deterministic 256-bit proof bound to the email", async () => {
    const a = await derivePasswordProof("Owner@Test.local ", PASSWORD);
    expect(isPasswordProof(a)).toBe(true);
    expect(await derivePasswordProof("owner@test.local", PASSWORD)).toBe(a);
    expect(await derivePasswordProof("other@test.local", PASSWORD)).not.toBe(a);
    expect(await derivePasswordProof("owner@test.local", "Different-Pass-1")).not.toBe(a);
  });

  it("stores only a keyed HMAC of the proof and verifies it in constant time", async () => {
    const proof = await P();
    const stored = passwordVerifier(proof);
    expect(stored).not.toContain(proof);
    expect(checkPasswordVerifier(proof, stored)).toBe(true);
    expect(checkPasswordVerifier(await P("Wrong-Password-9"), stored)).toBe(false);
    expect(checkPasswordVerifier(proof, "garbage")).toBe(false);
    expect(checkPasswordVerifier(proof, "locked$abc")).toBe(false);
  });

  it("enforces the password policy (client side)", () => {
    expect(passwordPolicyError("short")).toMatch(/12/);
    expect(passwordPolicyError("alllowercaseletters")).toMatch(/trois/);
    expect(passwordPolicyError(PASSWORD)).toBeNull();
  });

  it("never stores the password or the proof", async () => {
    const u = await makeUser();
    const [row] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, u.id));
    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(row.passwordHash).not.toContain(await P());
  });
});

describe("login", () => {
  it("authenticates with the right password (case-insensitive email)", async () => {
    await makeUser();
    const res = await authenticatePassword("OWNER@test.local", await P(), "1.2.3.4");
    expect(res).toMatchObject({ ok: true, twoFactorEnabled: false });
  });

  it("returns the same generic failure for unknown user and wrong password", async () => {
    await makeUser();
    expect(await authenticatePassword("owner@test.local", await P("Wrong-Password-9"), null)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticatePassword("owner@test.local", "not-a-proof", null)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticatePassword("ghost@test.local", await P(PASSWORD, "ghost@test.local"), null)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rate-limits after repeated failures, even with the right password", async () => {
    await makeUser();
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_EMAIL; i++) await authenticatePassword("owner@test.local", "0".repeat(64), "9.9.9.9");
    expect(await authenticatePassword("owner@test.local", await P(), "9.9.9.9")).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("refuses deactivated accounts", async () => {
    const u = await makeUser();
    await db().update(schema.adminUsers).set({ isActive: false }).where(eq(schema.adminUsers.id, u.id));
    expect((await authenticatePassword("owner@test.local", await P(), null)).ok).toBe(false);
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and validates it", async () => {
    const u = await makeUser();
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    const rows = await db().select().from(schema.sessions);
    expect(rows[0].id).not.toBe(token);
    const s = await validateSession(token);
    expect(s?.user.id).toBe(u.id);
    expect(s?.twoFactorVerified).toBe(true);
    expect(hasPermission(s!.user.permissions, "users.manage")).toBe(true);
  });

  it("rejects unknown, revoked and expired tokens", async () => {
    const u = await makeUser();
    expect(await validateSession("x".repeat(43))).toBeNull();
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    await revokeSession(token);
    expect(await validateSession(token)).toBeNull();
    const second = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    await db().update(schema.sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSession(second.token)).toBeNull();
  });

  it("expires idle verified sessions", async () => {
    const u = await makeUser();
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    await db().update(schema.sessions).set({ lastSeenAt: new Date(Date.now() - 3 * 3600_000) });
    expect(await validateSession(token)).toBeNull();
  });

  it("drops the session when the user is deactivated", async () => {
    const u = await makeUser();
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    await db().update(schema.adminUsers).set({ isActive: false });
    expect(await validateSession(token)).toBeNull();
  });
});

describe("role-based permissions", () => {
  it("restricts the reservations agent to reservations", async () => {
    const u = await makeUser("reservations", "agent@test.local");
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    const s = await validateSession(token);
    expect(hasPermission(s!.user.permissions, "reservations.manage")).toBe(true);
    expect(hasPermission(s!.user.permissions, "content.manage")).toBe(false);
    expect(hasPermission(s!.user.permissions, "users.manage")).toBe(false);
  });
});

describe("TOTP two-factor authentication", () => {
  it("encrypts secrets at rest (AES-256-GCM, tamper-evident)", () => {
    const enc = encrypt("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decrypt(enc)).toBe("JBSWY3DPEHPK3PXP");
    const [iv, tag, ct] = enc.split(".");
    const tampered = [iv, tag, ct.slice(0, -2) + (ct.endsWith("A") ? "BB" : "AA")].join(".");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("enrols with a QR code, confirms with a valid code and issues 10 recovery codes", async () => {
    const u = await makeUser();
    const setup = await beginTotpSetup(u.id, "owner@test.local");
    expect(setup.uri).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.uri).toContain("issuer=La%20Badira%20Admin");
    expect(setup.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

    expect(await confirmTotpSetup(u.id, "000000")).toBeNull();
    const codes = await confirmTotpSetup(u.id, await currentCode(u.id, "pendingSecretEnc"));
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    const stored = await db().select().from(schema.recoveryCodes);
    expect(stored.every((r) => !codes!.includes(r.codeHash))).toBe(true);
    expect((await authenticatePassword("owner@test.local", await P(), null)) as { twoFactorEnabled: boolean }).toMatchObject({ twoFactorEnabled: true });
  });

  async function enrolled() {
    const u = await makeUser();
    await beginTotpSetup(u.id, "owner@test.local");
    // Use the previous time step for enrolment so the current one stays usable.
    const codes = (await confirmTotpSetup(u.id, await currentCode(u.id, "pendingSecretEnc", -30)))!;
    return { u, codes };
  }

  it("requires a valid TOTP code and rejects replay of the same code", async () => {
    const { u } = await enrolled();
    expect((await verifySecondFactor(u.id, "123456")).ok).toBe(false);
    const code = await currentCode(u.id);
    expect(await verifySecondFactor(u.id, code)).toMatchObject({ ok: true, method: "totp" });
    expect((await verifySecondFactor(u.id, code)).ok).toBe(false);
  });

  it("accepts each recovery code exactly once", async () => {
    const { u, codes } = await enrolled();
    const res = await verifySecondFactor(u.id, codes[0].toUpperCase());
    expect(res).toMatchObject({ ok: true, method: "recovery", remainingRecoveryCodes: 9 });
    expect((await verifySecondFactor(u.id, codes[0])).ok).toBe(false);
    expect((await verifySecondFactor(u.id, "aaaaa-bbbbb")).ok).toBe(false);
  });

  it("lets an owner reset another user's 2FA, revoking their sessions", async () => {
    const { u } = await enrolled();
    const owner = await makeUser("owner", "boss@test.local");
    const { token } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    await resetTwoFactor(owner.id, u.id, null);
    expect(await validateSession(token)).toBeNull();
    expect(await db().select().from(schema.twoFactorAuth).where(eq(schema.twoFactorAuth.userId, u.id))).toHaveLength(0);
    const log = await db().select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "auth.2fa_reset"));
    expect(log[0].actorId).toBe(owner.id);
  });

  it("never writes secrets or codes into the audit log", async () => {
    const { codes } = await enrolled();
    const logs = JSON.stringify(await db().select().from(schema.auditLogs));
    for (const c of codes) expect(logs).not.toContain(c);
  });
});

describe("password reset & change", () => {
  it("resets with a single-use token and revokes sessions", async () => {
    const u = await makeUser();
    const { token: sessionToken } = await createSession(u.id, { twoFactorVerified: true, ip: null, userAgent: null });
    const token = await createPasswordResetToken(u.id);
    expect(await getResetTokenEmail(token)).toBe("owner@test.local");
    expect((await resetPasswordWithToken(token, "not-a-proof")).ok).toBe(false);
    expect(await resetPasswordWithToken(token, await P("New-Password-2027"))).toEqual({ ok: true });
    expect((await resetPasswordWithToken(token, await P("Another-Pass-2027"))).ok).toBe(false);
    expect(await getResetTokenEmail(token)).toBeNull();
    expect(await validateSession(sessionToken)).toBeNull();
    expect((await authenticatePassword("owner@test.local", await P("New-Password-2027"), null)).ok).toBe(true);
  });

  it("rejects expired tokens", async () => {
    const u = await makeUser();
    const token = await createPasswordResetToken(u.id);
    await db().update(schema.passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1) });
    expect((await resetPasswordWithToken(token, await P("New-Password-2027"))).ok).toBe(false);
  });

  it("changes the password only with the current one", async () => {
    const u = await makeUser();
    expect((await changePassword(u.id, await P("Wrong-Password-9"), await P("New-Password-2027"))).ok).toBe(false);
    expect((await changePassword(u.id, await P(), await P("New-Password-2027"))).ok).toBe(true);
    expect((await authenticatePassword("owner@test.local", await P("New-Password-2027"), null)).ok).toBe(true);
  });
});
