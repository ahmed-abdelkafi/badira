"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, userAgent } from "@/server/auth/dal";
import { changePassword, regenerateRecoveryCodes, revokeAllSessions } from "@/server/auth/service";
import { deleteSubscriptionsById, removeSubscription, saveSubscription, emitEvent, fanOutPush } from "@/server/notifications/push";
import { pushConfigured } from "@/server/env";
import { verifySecondFactor } from "@/server/auth/service";
import { rateLimit } from "@/server/rate-limit";

export type AccountState = { ok?: boolean; error?: string; message?: string; codes?: string[] };

export async function changePasswordAction(_p: AccountState, form: FormData): Promise<AccountState> {
  const user = await requireAdmin();
  const res = await changePassword(user.id, String(form.get("currentProof") ?? ""), String(form.get("nextProof") ?? ""));
  return res.ok ? { ok: true, message: "Mot de passe modifié." } : { error: res.error };
}

/** Regenerating codes requires a fresh TOTP code (step-up authentication). */
export async function regenerateCodesAction(_p: AccountState, form: FormData): Promise<AccountState> {
  const user = await requireAdmin();
  if (!(await rateLimit(`2fa-stepup:${user.id}`, 6, 15 * 60_000))) return { error: "Trop de tentatives." };
  const check = await verifySecondFactor(user.id, String(form.get("code") ?? ""));
  if (!check.ok || check.method !== "totp") return { error: "Code d’authentification invalide." };
  return { ok: true, codes: await regenerateRecoveryCodes(user.id) };
}

export async function signOutEverywhereAction(): Promise<void> {
  const user = await requireAdmin();
  await revokeAllSessions(user.id);
  revalidatePath("/admin");
}

const subSchema = z.object({
  endpoint: z.url().max(2000).refine((u) => u.startsWith("https://"), "https only"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function subscribePushAction(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin("reservations.view");
  if (!pushConfigured()) return { ok: false, error: "Notifications push non configurées sur le serveur." };
  const parsed = subSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Abonnement invalide." };
  await saveSubscription(user.id, parsed.data, await userAgent());
  revalidatePath("/admin/account");
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  const user = await requireAdmin();
  await removeSubscription(user.id, String(endpoint).slice(0, 2000));
  revalidatePath("/admin/account");
}

export async function removeDeviceAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (id.success) await deleteSubscriptionsById(user.id, [id.data]);
  revalidatePath("/admin/account");
}

/** Sends a test push to the current user's devices only. */
export async function testPushAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireAdmin("reservations.view");
  const eventId = await emitEvent("push.test", { userId: user.id });
  const res = await fanOutPush(eventId, { title: "La Badira — test", body: "Les notifications fonctionnent sur cet appareil.", url: "/admin/account", tag: `test-${eventId}` }, { onlyUserId: user.id });
  if (res.skipped) return { ok: false, message: "Push non configuré (clés VAPID)." };
  return { ok: res.sent > 0, message: `Envoyées : ${res.sent} · échecs : ${res.failed} · expirées supprimées : ${res.expired}` };
}
