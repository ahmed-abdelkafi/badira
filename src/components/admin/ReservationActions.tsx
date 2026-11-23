"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ReservationStatus } from "@/lib/reservation-status";
import { buildWhatsAppUrl, renderWhatsAppTemplate, type WhatsAppReservationContext, type WhatsAppTemplates } from "@/lib/whatsapp";
import type { Locale } from "@/i18n/config";
import { addNoteAction, changeStatusAction, logWhatsAppAction, type ActionResult } from "@/app/(admin)/admin/(panel)/reservations/actions";

const verb: Record<ReservationStatus, { label: string; cls: string; confirm: string }> = {
  confirmed: { label: "Accepter la demande", cls: "a-btn-success", confirm: "La demande deviendra une réservation confirmée." },
  declined: { label: "Refuser", cls: "a-btn-danger", confirm: "La demande sera refusée. Cette action est définitive." },
  cancelled: { label: "Annuler", cls: "a-btn-danger", confirm: "La réservation sera annulée. Cette action est définitive." },
  completed: { label: "Marquer comme terminée", cls: "", confirm: "Le séjour sera marqué comme terminé." },
  pending: { label: "", cls: "", confirm: "" },
};

/** Status buttons → native <dialog> confirmation with optional personal message. */
export function StatusActions({
  id,
  reference,
  allowed,
  defaultMessages,
}: {
  id: string;
  reference: string;
  allowed: ReservationStatus[];
  defaultMessages: Partial<Record<ReservationStatus, string>>;
}) {
  const [target, setTarget] = useState<ReservationStatus | null>(null);
  const [state, action, pending] = useActionState<ActionResult, FormData>(changeStatusAction, { ok: false });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (target) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [target]);
  // Close once the server confirms.
  const [handled, setHandled] = useState<ActionResult | null>(null);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setTarget(null);
  }

  if (!allowed.length) return <p className="text-sm text-stone">Aucune action possible : statut final.</p>;

  return (
    <div>
      {state.message && <p role="status" className="mb-3 rounded border border-[#c6e6d2] bg-[#eff8f2] px-3 py-2 text-sm">{state.message}</p>}
      <div className="flex flex-wrap gap-2">
        {allowed.map((s) => (
          <button key={s} type="button" className={`a-btn ${verb[s].cls}`} onClick={() => setTarget(s)}>
            {verb[s].label}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setTarget(null)}
        className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-md border border-[#e8e3d9] p-0 backdrop:bg-charcoal/50"
        aria-labelledby="status-dialog-title"
      >
        {target && (
          <form action={action} className="space-y-4 p-6">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value={target} />
            <h2 id="status-dialog-title" className="a-h2 text-base">{verb[target].label} — <span className="font-mono">{reference}</span></h2>
            <p className="text-sm text-stone">{verb[target].confirm}</p>
            {state.error && <p role="alert" className="rounded border border-[#f2c7c2] bg-[#fdf1ef] px-3 py-2 text-sm text-[#b42318]">{state.error}</p>}
            <div>
              <label htmlFor="status-message" className="a-label">Message personnalisé (enregistré dans l’historique — envoyez-le ensuite au client via WhatsApp)</label>
              <textarea id="status-message" name="message" rows={5} maxLength={4000} defaultValue={defaultMessages[target] ?? ""} className="a-input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="a-btn" onClick={() => setTarget(null)}>Annuler</button>
              <button className={`a-btn ${verb[target].cls || "a-btn-primary"}`} disabled={pending}>
                {pending ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}

/**
 * WhatsApp click-to-chat. Builds a pre-filled message from the templates and
 * opens wa.me in a new tab. The admin still presses "send" inside WhatsApp:
 * the history records "conversation opened", never "delivered".
 */
export function WhatsAppPanel({
  reservationId,
  phone,
  phoneDisplay,
  guestLocale,
  ctx,
  templates,
  categoryLabels,
}: {
  reservationId: string;
  phone: string;
  phoneDisplay: string;
  guestLocale: Locale;
  ctx: Omit<WhatsAppReservationContext, "categoryLabel">;
  templates: WhatsAppTemplates;
  categoryLabels: Record<Locale, string>;
}) {
  const [kind, setKind] = useState<"accept" | "decline" | "general">("general");
  const [locale, setLocale] = useState<Locale>(guestLocale);
  const rendered = useMemo(
    () => renderWhatsAppTemplate(templates[kind][locale], { ...ctx, categoryLabel: categoryLabels[locale] }, locale),
    [kind, locale, templates, ctx, categoryLabels],
  );
  const [edited, setEdited] = useState<{ base: string; text: string } | null>(null);
  const message = edited && edited.base === rendered ? edited.text : rendered;
  const url = buildWhatsAppUrl(phone, message);

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Numéro : <span className="font-mono" dir="ltr">{phoneDisplay}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="a-label" htmlFor="wa-kind">Modèle</label>
          <select id="wa-kind" className="a-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="general">Suivi de la demande</option>
            <option value="accept">Acceptation</option>
            <option value="decline">Refus</option>
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="wa-locale">Langue</label>
          <select id="wa-locale" className="a-input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>
      </div>
      <div>
        <label className="a-label" htmlFor="wa-text">Message (modifiable)</label>
        <textarea
          id="wa-text"
          rows={6}
          className="a-input"
          dir={locale === "ar" ? "rtl" : "ltr"}
          value={message}
          onChange={(e) => setEdited({ base: rendered, text: e.target.value })}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="a-btn a-btn-wa w-full"
        onClick={() => {
          void logWhatsAppAction(reservationId, edited && edited.base === rendered ? "custom" : kind, locale);
        }}
      >
        Ouvrir la conversation WhatsApp ↗
      </a>
      <p className="text-xs text-stone">
        WhatsApp s’ouvre avec le message pré-rempli : vous devez l’envoyer vous-même. L’envoi et la réception ne sont pas suivis par ce tableau de bord.
      </p>
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(addNoteAction, { ok: false });
  // A new key after each successful save remounts (clears) the form.
  const [formKey, setFormKey] = useState(0);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setFormKey((k) => k + 1);
  }
  return (
    <form key={formKey} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="note-body" className="sr-only">Nouvelle note interne</label>
      <textarea id="note-body" name="body" rows={3} maxLength={4000} required placeholder="Note interne (non visible par le client)" className="a-input" />
      {state.error && <p className="text-xs text-[#b42318]">{state.error}</p>}
      <button className="a-btn a-btn-sm" disabled={pending}>{pending ? "Ajout…" : "Ajouter la note"}</button>
    </form>
  );
}
