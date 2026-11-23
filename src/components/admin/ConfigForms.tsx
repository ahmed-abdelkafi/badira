"use client";

import { useActionState, useMemo, useState } from "react";
import type { Localized } from "@/lib/localized";
import type { ActionState } from "@/server/services/admin-helpers";
import {
  createUserAction,
  saveContactAction,
  saveTemplatesAction,
  saveTranslationsAction,
  userOpAction,
  type InviteState,
} from "@/app/(admin)/admin/(panel)/config-actions";
import { Feedback, LocalizedField, SubmitButton } from "./fields";

/* ------------------------------------------------------------------ */

export type TranslationRow = { key: string; base: Record<"fr" | "en" | "ar", string>; override: Partial<Record<"fr" | "en" | "ar", string>> };

export function TranslationsForm({ group, rows }: { group: string; rows: TranslationRow[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveTranslationsAction, {});
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.key.toLowerCase().includes(s) || Object.values(r.base).some((v) => v.toLowerCase().includes(s)) || Object.values(r.override).some((v) => v?.toLowerCase().includes(s)));
  }, [q, rows]);
  return (
    <form action={action} className="space-y-3">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Rechercher dans « ${group} »`} className="a-input max-w-sm" aria-label="Rechercher une traduction" />
      <div className="overflow-x-auto">
        <table className="a-table min-w-[900px]">
          <thead>
            <tr><th className="w-48">Clé</th><th>Français</th><th>English</th><th>العربية</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={visible.includes(r) ? "" : "hidden"}>
                <td className="font-mono text-[0.7rem] text-stone">{r.key}</td>
                {(["fr", "en", "ar"] as const).map((l) => {
                  const long = r.base[l].length > 60;
                  const props = {
                    name: `t.${l}.${r.key}`,
                    defaultValue: r.override[l] ?? r.base[l],
                    dir: l === "ar" ? ("rtl" as const) : ("ltr" as const),
                    lang: l,
                    "aria-label": `${r.key} (${l})`,
                    className: `a-input text-xs ${r.override[l] ? "border-champagne bg-[#fbf6ea]" : ""}`,
                  };
                  return <td key={l}>{long ? <textarea rows={3} {...props} /> : <input {...props} />}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone">Les champs surlignés diffèrent du texte d’origine. Videz un champ pour revenir au texte d’origine.</p>
      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer « {group} »</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

export type ContactValues = {
  address: Localized;
  phone: string;
  whatsapp: string;
  email: string;
  mapsUrl: string;
  social: Record<string, string | undefined>;
  [k: string]: unknown;
};

export function ContactForm({ c }: { c: ContactValues }) {
  const [state, action] = useActionState<ActionState, FormData>(saveContactAction, {});
  const link = (name: string, label: string, value?: unknown) => (
    <div key={name}>
      <label className="a-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="url" defaultValue={typeof value === "string" ? value : ""} className="a-input" placeholder="https://" />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><LocalizedField name="address" label="Adresse" value={c.address} maxLength={300} /></div>
      <div>
        <label className="a-label" htmlFor="phone">Téléphone (format international)</label>
        <input type="hidden" name="phoneDial" value="+216" />
        <input id="phone" name="phone" defaultValue={c.phone} required className="a-input" dir="ltr" />
      </div>
      <div>
        <label className="a-label" htmlFor="whatsapp">WhatsApp de l’hôtel (affiché sur le site)</label>
        <input type="hidden" name="whatsappDial" value="+216" />
        <input id="whatsapp" name="whatsapp" defaultValue={c.whatsapp} className="a-input" dir="ltr" />
      </div>
      <div className="md:col-span-2">
        <label className="a-label" htmlFor="email">E-mail de contact</label>
        <input id="email" name="email" type="email" defaultValue={c.email} required className="a-input" />
      </div>
      {link("mapsUrl", "Lien Google Maps (laisser vide = recherche « La Badira Hammamet »)", c.mapsUrl)}
      {link("leadersClubUrl", "Lien Leading Hotels / Leaders Club", c.leadersClubUrl)}
      {link("facebook", "Facebook", c.social.facebook)}
      {link("instagram", "Instagram", c.social.instagram)}
      {link("linkedin", "LinkedIn", c.social.linkedin)}
      {link("twitter", "X / Twitter", c.social.twitter)}
      {link("spaBookingUrl", "Réservation Spa (Spatime)", c.spaBookingUrl)}
      {link("spaMenuUrl", "Carte des soins (PDF)", c.spaMenuUrl)}
      {link("conciergeBrochureUrl", "Brochure conciergerie (PDF)", c.conciergeBrochureUrl)}
      {link("dressCodeUrl", "Code vestimentaire (PDF)", c.dressCodeUrl)}
      <div className="flex items-center gap-3 md:col-span-2">
        <SubmitButton>Enregistrer</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function TemplatesForm({ templates }: { templates: Record<"accept" | "decline" | "general", Localized> }) {
  const [state, action] = useActionState<ActionState, FormData>(saveTemplatesAction, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-xs text-stone">Variables disponibles : [CLIENT] [REFERENCE] [CHECK_IN] [CHECK_OUT] [CATEGORY] [GUESTS]</p>
      <LocalizedField name="accept" label="Acceptation" value={templates.accept} multiline rows={4} maxLength={1500} />
      <LocalizedField name="decline" label="Refus" value={templates.decline} multiline rows={4} maxLength={1500} />
      <LocalizedField name="general" label="Suivi de la demande" value={templates.general} multiline rows={3} maxLength={1500} />
      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer les modèles</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function LinkBox({ state }: { state: InviteState }) {
  if (!state.link) return null;
  return (
    <div className="mt-2 rounded border border-[#e6d9bf] bg-[#fbf6ea] p-3 text-xs">
      <p className="mb-1 font-medium">Lien à usage unique (30 min) — ne le partagez qu’avec la personne concernée :</p>
      <code className="block break-all">{state.link}</code>
      <button type="button" className="a-btn a-btn-sm mt-2" onClick={() => navigator.clipboard.writeText(state.link!)}>Copier</button>
    </div>
  );
}

export function CreateUserForm({ roles }: { roles: { key: string; name: string }[] }) {
  const [state, action] = useActionState<InviteState, FormData>(createUserAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
      <div><label className="a-label" htmlFor="u-name">Nom</label><input id="u-name" name="name" required maxLength={80} className="a-input" /></div>
      <div><label className="a-label" htmlFor="u-email">E-mail</label><input id="u-email" name="email" type="email" required className="a-input" /></div>
      <div>
        <label className="a-label" htmlFor="u-role">Rôle</label>
        <select id="u-role" name="role" className="a-input" defaultValue="reservations">
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </div>
      <SubmitButton>Créer et inviter</SubmitButton>
      <div className="md:col-span-4"><Feedback state={state} /><LinkBox state={state} /></div>
    </form>
  );
}

export function UserOps({ id, isActive, roleKey, roles, self }: { id: string; isActive: boolean; roleKey: string; roles: { key: string; name: string }[]; self: boolean }) {
  const [state, action] = useActionState<InviteState, FormData>(userOpAction, {});
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const confirmText: Record<string, string> = {
    deactivate: "Désactiver ce compte et fermer ses sessions ?",
    reset2fa: "Réinitialiser la double authentification de cet utilisateur ?",
  };
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <select name="role" defaultValue={roleKey} className="a-input !w-auto !py-1 text-xs" aria-label="Rôle" disabled={self}>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
        <button name="op" value="role" className="a-btn a-btn-sm" disabled={self}>Changer le rôle</button>
        <button name="op" value="resetLink" className="a-btn a-btn-sm">Lien de réinitialisation</button>
        {!self && (
          pendingOp ? (
            <>
              <span className="text-xs">{confirmText[pendingOp]}</span>
              <button name="op" value={pendingOp} className="a-btn a-btn-sm a-btn-danger" onClick={() => setTimeout(() => setPendingOp(null), 0)}>Confirmer</button>
              <button type="button" className="a-btn a-btn-sm" onClick={() => setPendingOp(null)}>Annuler</button>
            </>
          ) : (
            <>
              <button type="button" className="a-btn a-btn-sm" onClick={() => setPendingOp("reset2fa")}>Réinitialiser 2FA</button>
              {isActive ? (
                <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPendingOp("deactivate")}>Désactiver</button>
              ) : (
                <button name="op" value="activate" className="a-btn a-btn-sm">Réactiver</button>
              )}
            </>
          )
        )}
      </form>
      <Feedback state={state} />
      <LinkBox state={state} />
    </div>
  );
}
