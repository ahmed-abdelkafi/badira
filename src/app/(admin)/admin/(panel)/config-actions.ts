"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, clientIp } from "@/server/auth/dal";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { readLocalized } from "@/server/services/content";
import { invalidate, TAGS, type ActionState } from "@/server/services/admin-helpers";
import { baseDictionaries } from "@/i18n/get-dictionary";
import { flatten } from "@/i18n/flatten";
import { locales } from "@/i18n/config";
import { toE164 } from "@/lib/phone";
import { createPasswordResetToken, resetTwoFactor, revokeAllSessions } from "@/server/auth/service";
import { randomToken } from "@/server/auth/crypto";
import { defaultRoles } from "@/server/auth/permissions";

/* ------------------------------------------------------------------ */
/* Translations                                                        */
/* ------------------------------------------------------------------ */

export async function saveTranslationsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  const flat = Object.fromEntries(locales.map((l) => [l, flatten(baseDictionaries[l])]));
  let changed = 0;
  for (const [field, raw] of form.entries()) {
    const m = /^t\.(fr|en|ar)\.(.+)$/.exec(field);
    if (!m || typeof raw !== "string") continue;
    const [, locale, key] = m as unknown as [string, "fr" | "en" | "ar", string];
    if (!(key in flat[locale])) continue; // unknown keys are ignored
    const value = raw.trim().slice(0, 2000);
    if (!value || value === flat[locale][key]) {
      const del = await db().delete(schema.translations).where(and(eq(schema.translations.locale, locale), eq(schema.translations.key, key))).returning();
      changed += del.length;
    } else {
      const [existing] = await db().select().from(schema.translations).where(and(eq(schema.translations.locale, locale), eq(schema.translations.key, key)));
      if (existing?.value === value) continue;
      await db()
        .insert(schema.translations)
        .values({ locale, key, value })
        .onConflictDoUpdate({ target: [schema.translations.locale, schema.translations.key], set: { value } });
      changed++;
    }
  }
  if (changed) {
    await audit({ actorId: user.id, action: "translations.updated", meta: { changed } });
    invalidate(TAGS.translations);
  }
  revalidatePath("/admin/translations");
  return { ok: true, message: changed ? `${changed} traduction(s) mise(s) à jour.` : "Aucun changement." };
}

/* ------------------------------------------------------------------ */
/* Contact & WhatsApp settings                                         */
/* ------------------------------------------------------------------ */

const urlOrEmpty = z.union([z.literal(""), z.url().refine((u) => /^https?:\/\//.test(u))]);

export async function saveContactAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("settings.manage");
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const phone = toE164(str("phoneDial") || "+216", str("phone"));
  const whatsapp = str("whatsapp") ? toE164(str("whatsappDial") || "+216", str("whatsapp")) : "";
  if (!phone) return { error: "Numéro de téléphone invalide." };
  if (whatsapp === null) return { error: "Numéro WhatsApp invalide." };
  const email = z.email().safeParse(str("email"));
  if (!email.success) return { error: "E-mail invalide." };
  const urls: Record<string, string> = {};
  for (const k of ["mapsUrl", "facebook", "instagram", "linkedin", "twitter", "spaBookingUrl", "spaMenuUrl", "conciergeBrochureUrl", "dressCodeUrl", "leadersClubUrl"]) {
    const v = urlOrEmpty.safeParse(str(k));
    if (!v.success) return { error: `Lien invalide : ${k}` };
    urls[k] = v.data;
  }
  const value = {
    address: readLocalized(form, "address", 300),
    phone,
    whatsapp,
    email: email.data,
    mapsUrl: urls.mapsUrl,
    social: { facebook: urls.facebook, instagram: urls.instagram, linkedin: urls.linkedin, twitter: urls.twitter },
    spaBookingUrl: urls.spaBookingUrl,
    spaMenuUrl: urls.spaMenuUrl,
    conciergeBrochureUrl: urls.conciergeBrochureUrl,
    dressCodeUrl: urls.dressCodeUrl,
    leadersClubUrl: urls.leadersClubUrl,
  };
  await db().insert(schema.settings).values({ key: "contact", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  await audit({ actorId: user.id, action: "settings.contact_updated" });
  invalidate(TAGS.settings);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Coordonnées enregistrées et publiées." };
}

export async function saveTemplatesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("settings.manage");
  const value = {
    accept: readLocalized(form, "accept", 1500),
    decline: readLocalized(form, "decline", 1500),
    general: readLocalized(form, "general", 1500),
  };
  for (const [k, v] of Object.entries(value)) {
    for (const l of locales) if (v[l] && !v[l]!.includes("[REFERENCE]")) return { error: `Le modèle « ${k} » (${l}) doit contenir [REFERENCE].` };
  }
  await db().insert(schema.settings).values({ key: "whatsapp.templates", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  await audit({ actorId: user.id, action: "settings.whatsapp_templates_updated" });
  invalidate(TAGS.settings);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Modèles WhatsApp enregistrés." };
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export type InviteState = ActionState & { link?: string };

/** One-time link (30 min) to set a password. Shared by the owner personally (e.g. WhatsApp) — no email. */
async function issueResetLink(userId: string) {
  const token = await createPasswordResetToken(userId);
  return `${env().SITE_URL}/admin/reset-password/${token}`;
}

export async function createUserAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const actor = await requireAdmin("users.manage");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const role = z.enum(defaultRoles.map((r) => r.key) as [string, ...string[]]).safeParse(form.get("role"));
  if (!name || !email.success || !role.success) return { error: "Nom, e-mail et rôle sont obligatoires." };
  const [exists] = await db().select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(sql`lower(${schema.adminUsers.email}) = ${email.data}`);
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };
  // Unusable random password until the user sets one through the link.
  const [u] = await db()
    .insert(schema.adminUsers)
    .values({ name, email: email.data, roleKey: role.data, passwordHash: `locked$${randomToken(32)}` })
    .returning();
  await audit({ actorId: actor.id, action: "user.created", entityType: "admin_user", entityId: u.id, meta: { role: role.data }, ip: await clientIp() });
  const link = await issueResetLink(u.id);
  revalidatePath("/admin/users");
  return { ok: true, message: "Compte créé. Transmettez ce lien personnellement (WhatsApp) : valable 30 minutes, usage unique.", link };
}

export async function userOpAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  const actor = await requireAdmin("users.manage");
  const id = z.uuid().parse(form.get("id"));
  const op = z.enum(["deactivate", "activate", "reset2fa", "resetLink", "role"]).parse(form.get("op"));
  const [target] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, id));
  if (!target) return { error: "Utilisateur introuvable." };
  const ip = await clientIp();

  const otherActiveOwners = async () => {
    const [{ n }] = await db()
      .select({ n: sql<number>`count(*)` })
      .from(schema.adminUsers)
      .where(and(eq(schema.adminUsers.roleKey, "owner"), eq(schema.adminUsers.isActive, true), ne(schema.adminUsers.id, id)));
    return n;
  };

  switch (op) {
    case "deactivate":
      if (id === actor.id) return { error: "Vous ne pouvez pas désactiver votre propre compte." };
      if (target.roleKey === "owner" && (await otherActiveOwners()) === 0) return { error: "Impossible : c’est le dernier propriétaire actif." };
      await db().update(schema.adminUsers).set({ isActive: false }).where(eq(schema.adminUsers.id, id));
      await revokeAllSessions(id);
      break;
    case "activate":
      await db().update(schema.adminUsers).set({ isActive: true }).where(eq(schema.adminUsers.id, id));
      break;
    case "reset2fa":
      if (id === actor.id) return { error: "Utilisez « Mon compte » pour vos propres codes ; un autre propriétaire doit réinitialiser votre 2FA." };
      await resetTwoFactor(actor.id, id, ip);
      revalidatePath("/admin/users");
      return { ok: true, message: "Double authentification réinitialisée : l’utilisateur devra la configurer à sa prochaine connexion." };
    case "resetLink": {
      const link = await issueResetLink(id);
      await audit({ actorId: actor.id, action: "user.reset_link_issued", entityType: "admin_user", entityId: id, ip });
      return { ok: true, message: "Transmettez ce lien personnellement (30 minutes, usage unique).", link };
    }
    case "role": {
      const role = z.enum(defaultRoles.map((r) => r.key) as [string, ...string[]]).parse(form.get("role"));
      if (target.roleKey === "owner" && role !== "owner" && (await otherActiveOwners()) === 0) return { error: "Impossible : c’est le dernier propriétaire actif." };
      await db().update(schema.adminUsers).set({ roleKey: role }).where(eq(schema.adminUsers.id, id));
      await audit({ actorId: actor.id, action: "user.role_changed", entityType: "admin_user", entityId: id, meta: { from: target.roleKey, to: role }, ip });
      revalidatePath("/admin/users");
      return { ok: true, message: "Rôle mis à jour." };
    }
  }
  await audit({ actorId: actor.id, action: `user.${op}`, entityType: "admin_user", entityId: id, ip });
  revalidatePath("/admin/users");
  return { ok: true, message: "Utilisateur mis à jour." };
}
