import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { env } from "@/server/env";
import { hasPermission, type Permission } from "./permissions";
import { validateSession, type AdminIdentity, type SessionState } from "./service";

export const SESSION_COOKIE = "lb_admin_session";

function secureCookies(): boolean {
  return env().SITE_URL.startsWith("https://");
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(secureCookies() ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(`__Host-${SESSION_COOKIE}`)?.value ?? jar.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete({ name: `__Host-${SESSION_COOKIE}`, path: "/", secure: true });
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  if (env().TRUST_PROXY === "true") {
    const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd.slice(0, 64);
  }
  return h.get("x-real-ip")?.slice(0, 64) ?? null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

/** Session for the current request (memoised per request). */
export const getSession = cache(async (): Promise<SessionState | null> => {
  return validateSession(await readSessionToken());
});

/**
 * Data Access Layer guard. Use in EVERY admin page, server action and route
 * handler — the proxy only performs an optimistic redirect.
 */
export async function requireAdmin(permission?: Permission): Promise<AdminIdentity> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.twoFactorVerified) {
    redirect(session.user.twoFactorEnabled ? "/admin/login/verify" : "/admin/login/setup-2fa");
  }
  if (permission && !hasPermission(session.user.permissions, permission)) forbidden();
  return session.user;
}

/** Same as requireAdmin but returns null instead of redirecting (route handlers). */
export async function getAdminOrNull(permission?: Permission): Promise<AdminIdentity | null> {
  const session = await getSession();
  if (!session || !session.twoFactorVerified) return null;
  if (permission && !hasPermission(session.user.permissions, permission)) return null;
  return session.user;
}

export function can(user: AdminIdentity, permission: Permission): boolean {
  return hasPermission(user.permissions, permission);
}
