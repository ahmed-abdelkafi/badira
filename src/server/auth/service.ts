import "server-only";
import { and, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import { batch, db, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { checkPasswordVerifier, decrypt, encrypt, hmacCode, passwordVerifier, randomToken, sha256 } from "./crypto";
import { isPasswordProof, normalizeEmail } from "@/lib/password";
import {
  generateRecoveryCodes,
  newTotpSecret,
  normalizeRecoveryCode,
  totpQrDataUrl,
  totpUri,
  verifyTotp,
} from "./totp";

export const SESSION_ABSOLUTE_MS = 12 * 3600_000;
export const SESSION_IDLE_MS = 2 * 3600_000;
export const PENDING_2FA_MS = 10 * 60_000;
export const LOGIN_MAX_FAILURES_PER_EMAIL = 5;
export const LOGIN_MAX_FAILURES_PER_IP = 20;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const RESET_TOKEN_TTL_MS = 30 * 60_000;

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  twoFactorEnabled: boolean;
};

export type SessionState = {
  sessionId: string;
  twoFactorVerified: boolean;
  user: AdminIdentity;
};

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

async function loadIdentity(userId: string): Promise<AdminIdentity | null> {
  const rows = await db()
    .select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      isActive: schema.adminUsers.isActive,
      roleKey: schema.roles.key,
      roleName: schema.roles.name,
      permissions: schema.roles.permissions,
      totpEnabledAt: schema.twoFactorAuth.enabledAt,
    })
    .from(schema.adminUsers)
    .innerJoin(schema.roles, eq(schema.roles.key, schema.adminUsers.roleKey))
    .leftJoin(schema.twoFactorAuth, eq(schema.twoFactorAuth.userId, schema.adminUsers.id))
    .where(eq(schema.adminUsers.id, userId))
    .limit(1);
  const r = rows[0];
  if (!r || !r.isActive) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    roleKey: r.roleKey,
    roleName: r.roleName,
    permissions: r.permissions,
    twoFactorEnabled: !!r.totpEnabledAt,
  };
}

/** `proof` = derivePasswordProof(email, password), computed client-side (src/lib/password.ts). */
export async function createAdminUser(input: { email: string; name: string; proof: string; roleKey: string }) {
  if (!isPasswordProof(input.proof)) throw new Error("Invalid password proof.");
  const [user] = await db()
    .insert(schema.adminUsers)
    .values({
      email: normalizeEmail(input.email),
      name: input.name.trim(),
      passwordHash: passwordVerifier(input.proof),
      roleKey: input.roleKey,
      passwordChangedAt: new Date(),
    })
    .returning({ id: schema.adminUsers.id });
  return user;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export type LoginResult =
  | { ok: true; userId: string; twoFactorEnabled: boolean }
  | { ok: false; reason: "invalid" | "rate_limited" };

async function recentFailures(email: string, ip: string | null) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [byEmail] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.email, email),
        eq(schema.loginAttempts.success, false),
        gte(schema.loginAttempts.createdAt, since),
      ),
    );
  let byIp = 0;
  if (ip) {
    const [r] = await db()
      .select({ n: sql<number>`count(*)` })
      .from(schema.loginAttempts)
      .where(
        and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.success, false), gte(schema.loginAttempts.createdAt, since)),
      );
    byIp = r.n;
  }
  return { byEmail: byEmail.n, byIp };
}

export async function authenticatePassword(emailRaw: string, proof: string, ip: string | null): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase().slice(0, 254);
  const failures = await recentFailures(email, ip);
  if (failures.byEmail >= LOGIN_MAX_FAILURES_PER_EMAIL || failures.byIp >= LOGIN_MAX_FAILURES_PER_IP) {
    return { ok: false, reason: "rate_limited" };
  }

  const [user] = await db()
    .select({ id: schema.adminUsers.id, hash: schema.adminUsers.passwordHash, isActive: schema.adminUsers.isActive })
    .from(schema.adminUsers)
    .where(sql`lower(${schema.adminUsers.email}) = ${email}`)
    .limit(1);

  // Constant-time check; unknown users go through the same code path.
  const valid = isPasswordProof(proof) && checkPasswordVerifier(proof, user?.hash ?? "v1$" + "0".repeat(64));
  const success = !!user && user.isActive && valid;
  await db().insert(schema.loginAttempts).values({ email, ip, success });

  if (!success) {
    if (user) await audit({ actorId: user.id, action: "auth.login_failed", ip });
    return { ok: false, reason: "invalid" };
  }
  const identity = await loadIdentity(user.id);
  return { ok: true, userId: user.id, twoFactorEnabled: !!identity?.twoFactorEnabled };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export async function createSession(
  userId: string,
  opts: { twoFactorVerified: boolean; ip: string | null; userAgent: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const ttl = opts.twoFactorVerified ? SESSION_ABSOLUTE_MS : PENDING_2FA_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await db()
    .insert(schema.sessions)
    .values({
      id: sha256(token),
      userId,
      twoFactorVerified: opts.twoFactorVerified,
      ip: opts.ip,
      userAgent: opts.userAgent?.slice(0, 300) ?? null,
      expiresAt,
    });
  return { token, expiresAt };
}

export async function validateSession(token: string | undefined | null): Promise<SessionState | null> {
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const [s] = await db().select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() <= now || (s.twoFactorVerified && now - s.lastSeenAt.getTime() > SESSION_IDLE_MS)) {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  const user = await loadIdentity(s.userId);
  if (!user) {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  // Throttle "last seen" writes to once a minute.
  if (now - s.lastSeenAt.getTime() > 60_000) {
    await db().update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, id));
  }
  return { sessionId: id, twoFactorVerified: s.twoFactorVerified, user };
}

export async function revokeSession(token: string): Promise<void> {
  await db().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

/* ------------------------------------------------------------------ */
/* Two-factor authentication (TOTP)                                    */
/* ------------------------------------------------------------------ */

export async function beginTotpSetup(userId: string, accountLabel: string) {
  const secret = newTotpSecret();
  const existing = await db()
    .select({ enabledAt: schema.twoFactorAuth.enabledAt })
    .from(schema.twoFactorAuth)
    .where(eq(schema.twoFactorAuth.userId, userId));
  if (existing[0]?.enabledAt) throw new Error("Two-factor authentication is already enabled.");
  await db()
    .insert(schema.twoFactorAuth)
    .values({ userId, pendingSecretEnc: encrypt(secret) })
    .onConflictDoUpdate({ target: schema.twoFactorAuth.userId, set: { pendingSecretEnc: encrypt(secret) } });
  const uri = totpUri(secret, accountLabel);
  return { secret, uri, qrDataUrl: await totpQrDataUrl(uri) };
}

async function storeNewRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await batch([
    db().delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, userId)),
    db().insert(schema.recoveryCodes).values(codes.map((c) => ({ userId, codeHash: hmacCode(c) }))),
  ]);
  return codes;
}

/** Confirms the pending secret with a first code. Returns one-time recovery codes. */
export async function confirmTotpSetup(userId: string, code: string): Promise<string[] | null> {
  const [row] = await db().select().from(schema.twoFactorAuth).where(eq(schema.twoFactorAuth.userId, userId));
  if (!row?.pendingSecretEnc || row.enabledAt) return null;
  const step = await verifyTotp(decrypt(row.pendingSecretEnc), code);
  if (step === null) return null;
  await db()
    .update(schema.twoFactorAuth)
    .set({ secretEnc: row.pendingSecretEnc, pendingSecretEnc: null, enabledAt: new Date(), lastUsedTimeStep: step })
    .where(eq(schema.twoFactorAuth.userId, userId));
  const codes = await storeNewRecoveryCodes(userId);
  await audit({ actorId: userId, action: "auth.2fa_enabled", entityType: "admin_user", entityId: userId });
  return codes;
}

export type SecondFactorResult = { ok: true; method: "totp" | "recovery"; remainingRecoveryCodes?: number } | { ok: false };

/** Verifies a TOTP code or, if it looks like one, a recovery code. */
export async function verifySecondFactor(userId: string, input: string): Promise<SecondFactorResult> {
  const [row] = await db().select().from(schema.twoFactorAuth).where(eq(schema.twoFactorAuth.userId, userId));
  if (!row?.secretEnc || !row.enabledAt) return { ok: false };

  const digits = input.replace(/\s+/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = await verifyTotp(decrypt(row.secretEnc), digits, row.lastUsedTimeStep);
    if (step === null) return { ok: false };
    // Conditional update guards against concurrent replay of the same code.
    const updated = await db()
      .update(schema.twoFactorAuth)
      .set({ lastUsedTimeStep: step })
      .where(
        and(
          eq(schema.twoFactorAuth.userId, userId),
          sql`(${schema.twoFactorAuth.lastUsedTimeStep} IS NULL OR ${schema.twoFactorAuth.lastUsedTimeStep} < ${step})`,
        ),
      )
      .returning({ userId: schema.twoFactorAuth.userId });
    return updated.length ? { ok: true, method: "totp" } : { ok: false };
  }

  const normalized = normalizeRecoveryCode(input);
  if (!/^[a-z0-9]{5}-[a-z0-9]{5}$/.test(normalized)) return { ok: false };
  // Single conditional UPDATE: consumes the code at most once, even under concurrency.
  const used = await db()
    .update(schema.recoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.recoveryCodes.userId, userId), eq(schema.recoveryCodes.codeHash, hmacCode(normalized)), isNull(schema.recoveryCodes.usedAt)))
    .returning({ id: schema.recoveryCodes.id });
  if (!used.length) return { ok: false };
  await audit({ actorId: userId, action: "auth.recovery_code_used", entityType: "admin_user", entityId: userId });
  return { ok: true, method: "recovery", remainingRecoveryCodes: await countUnusedRecoveryCodes(userId) };
}

export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = await storeNewRecoveryCodes(userId);
  await audit({ actorId: userId, action: "auth.recovery_codes_regenerated", entityType: "admin_user", entityId: userId });
  return codes;
}

export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  const [r] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(schema.recoveryCodes)
    .where(and(eq(schema.recoveryCodes.userId, userId), isNull(schema.recoveryCodes.usedAt)));
  return r.n;
}

/** Owner-only reset of another user's 2FA. The target must enrol again at next login. */
export async function resetTwoFactor(actorId: string, targetUserId: string, ip: string | null): Promise<void> {
  await batch([
    db().delete(schema.twoFactorAuth).where(eq(schema.twoFactorAuth.userId, targetUserId)),
    db().delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, targetUserId)),
    db().delete(schema.sessions).where(eq(schema.sessions.userId, targetUserId)),
    db().insert(schema.auditLogs).values({ actorId, action: "auth.2fa_reset", entityType: "admin_user", entityId: targetUserId, ip }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

/** Returns the raw token (to be emailed) — only its hash is stored. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomToken(32);
  await db().delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, userId));
  await db()
    .insert(schema.passwordResetTokens)
    .values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
  return token;
}

export async function findUserByEmail(email: string) {
  const [u] = await db()
    .select({ id: schema.adminUsers.id, name: schema.adminUsers.name, email: schema.adminUsers.email, isActive: schema.adminUsers.isActive })
    .from(schema.adminUsers)
    .where(sql`lower(${schema.adminUsers.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return u ?? null;
}

/** Email of the account behind a valid, unused reset token (the browser needs it to derive the proof). */
export async function getResetTokenEmail(token: string): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db()
    .select({ email: schema.adminUsers.email })
    .from(schema.passwordResetTokens)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.passwordResetTokens.userId))
    .where(and(eq(schema.passwordResetTokens.tokenHash, sha256(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())));
  return row?.email ?? null;
}

export async function resetPasswordWithToken(
  token: string,
  newProof: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPasswordProof(newProof)) return { ok: false, error: "Mot de passe invalide." };
  const hash = sha256(token);
  const consumed = await db()
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.passwordResetTokens.tokenHash, hash),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: schema.passwordResetTokens.userId });
  if (!consumed.length) return { ok: false, error: "Ce lien est invalide ou a expiré." };
  const userId = consumed[0].userId;
  await db()
    .update(schema.adminUsers)
    .set({ passwordHash: passwordVerifier(newProof), passwordChangedAt: new Date() })
    .where(eq(schema.adminUsers.id, userId));
  await revokeAllSessions(userId);
  await audit({ actorId: userId, action: "auth.password_reset", entityType: "admin_user", entityId: userId });
  return { ok: true };
}

export async function changePassword(
  userId: string,
  currentProof: string,
  nextProof: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [u] = await db().select({ hash: schema.adminUsers.passwordHash }).from(schema.adminUsers).where(eq(schema.adminUsers.id, userId));
  if (!u || !isPasswordProof(currentProof) || !checkPasswordVerifier(currentProof, u.hash)) return { ok: false, error: "Mot de passe actuel incorrect." };
  if (!isPasswordProof(nextProof)) return { ok: false, error: "Nouveau mot de passe invalide." };
  await db()
    .update(schema.adminUsers)
    .set({ passwordHash: passwordVerifier(nextProof), passwordChangedAt: new Date() })
    .where(eq(schema.adminUsers.id, userId));
  await audit({ actorId: userId, action: "auth.password_changed", entityType: "admin_user", entityId: userId });
  return { ok: true };
}
