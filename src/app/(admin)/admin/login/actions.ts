"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import {
  authenticatePassword,
  confirmTotpSetup,
  createSession,
  resetPasswordWithToken,
  revokeSession,
  verifySecondFactor,
} from "@/server/auth/service";
import { clearSessionCookie, clientIp, getSession, readSessionToken, setSessionCookie, userAgent } from "@/server/auth/dal";

export type FormState = { error?: string; ok?: boolean; message?: string; codes?: string[] };

/** Only allow internal admin redirects after login. */
function safeNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "";
  return /^\/admin(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(v) && !v.startsWith("/admin/login") ? v : "/admin";
}

const loginSchema = z.object({ email: z.string().trim().min(3).max(254), proof: z.string().regex(/^[0-9a-f]{64}$/) });

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), proof: form.get("proof") });
  if (!parsed.success) return { error: "Identifiants invalides." };
  const ip = await clientIp();
  const res = await authenticatePassword(parsed.data.email, parsed.data.proof, ip);
  if (!res.ok) {
    return {
      error:
        res.reason === "rate_limited"
          ? "Trop de tentatives. Réessayez dans 15 minutes."
          : "Identifiants invalides.",
    };
  }
  // Discard any previous session from this browser.
  const old = await readSessionToken();
  if (old) await revokeSession(old);
  const { token, expiresAt } = await createSession(res.userId, { twoFactorVerified: false, ip, userAgent: await userAgent() });
  await setSessionCookie(token, expiresAt);
  const next = safeNext(form.get("next"));
  redirect(res.twoFactorEnabled ? `/admin/login/verify?next=${encodeURIComponent(next)}` : "/admin/login/setup-2fa");
}

async function upgradeToVerifiedSession(userId: string, method: string) {
  const old = await readSessionToken();
  if (old) await revokeSession(old);
  const ip = await clientIp();
  const { token, expiresAt } = await createSession(userId, { twoFactorVerified: true, ip, userAgent: await userAgent() });
  await setSessionCookie(token, expiresAt);
  await db().update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, userId));
  await audit({ actorId: userId, action: "auth.login", meta: { method }, ip });
}

export async function verifyTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.twoFactorVerified) redirect("/admin");
  if (!(await rateLimit(`2fa:${session.user.id}`, 6, 15 * 60_000))) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }
  const code = String(form.get("code") ?? "").slice(0, 32);
  const result = await verifySecondFactor(session.user.id, code);
  if (!result.ok) {
    await audit({ actorId: session.user.id, action: "auth.2fa_failed", ip: await clientIp() });
    return { error: "Code invalide ou déjà utilisé." };
  }
  await upgradeToVerifiedSession(session.user.id, result.method);
  redirect(safeNext(form.get("next")));
}

export async function confirmSetupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.user.twoFactorEnabled) redirect(session.twoFactorVerified ? "/admin" : "/admin/login/verify");
  if (!(await rateLimit(`2fa-setup:${session.user.id}`, 10, 15 * 60_000))) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }
  const codes = await confirmTotpSetup(session.user.id, String(form.get("code") ?? ""));
  if (!codes) return { error: "Code invalide. Vérifiez l'heure de votre téléphone et réessayez." };
  // Mark THIS session verified in the database without touching the cookie, so
  // the page is not re-rendered (which would redirect before the codes are seen).
  // The token is rotated in finishEnrolmentAction.
  await db().update(schema.sessions).set({ twoFactorVerified: true }).where(eq(schema.sessions.id, session.sessionId));
  // Codes are returned ONCE to the browser for display; only hashes are stored.
  return { ok: true, codes };
}

/** After the recovery codes were shown: rotate the session token and enter the dashboard. */
export async function finishEnrolmentAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.twoFactorVerified) redirect("/admin/login/setup-2fa");
  await upgradeToVerifiedSession(session.user.id, "totp_enrolment");
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  const session = await getSession();
  if (token) await revokeSession(token);
  await clearSessionCookie();
  if (session) await audit({ actorId: session.user.id, action: "auth.logout" });
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* Password reset (via a one-time link generated by an owner)          */
/* ------------------------------------------------------------------ */

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!(await rateLimit(`reset:ip:${ip ?? "unknown"}`, 10, 60 * 60_000))) return { error: "Trop de tentatives. Réessayez plus tard." };
  const res = await resetPasswordWithToken(String(form.get("token") ?? ""), String(form.get("proof") ?? ""));
  if (!res.ok) return { error: res.error };
  return { ok: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." };
}
