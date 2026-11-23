import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/server/auth/dal";
import { getReservation } from "@/server/services/reservations";
import { getWhatsAppTemplates } from "@/server/content/queries";
import { nextStatuses } from "@/lib/reservation-status";
import { categoryLabel } from "@/lib/categories";
import { formatDate, nightsBetween } from "@/lib/dates";
import { formatPhoneDisplay } from "@/lib/phone";
import { isLocale, localeMeta, type Locale } from "@/i18n/config";
import { renderWhatsAppTemplate } from "@/lib/whatsapp";
import { PageHeader, StatusBadge, statusLabels } from "@/components/admin/ui";
import { NoteForm, StatusActions, WhatsAppPanel } from "@/components/admin/ReservationActions";

export const metadata = { title: "Demande de réservation" };

const historyLabels: Record<string, string> = {
  created: "Demande reçue via le site",
  status_changed: "Changement de statut",
  whatsapp_opened: "Conversation WhatsApp ouverte",
  note_added: "Note interne ajoutée",
};

export default async function ReservationDetailPage({ params }: PageProps<"/admin/reservations/[id]">) {
  const user = await requireAdmin("reservations.view");
  const { id } = await params;
  const r = await getReservation(id);
  if (!r) notFound();
  const templates = await getWhatsAppTemplates();
  const guestLocale: Locale = isLocale(r.locale) ? r.locale : "fr";
  const manage = can(user, "reservations.manage");
  const labels = {
    fr: r.suiteName ?? categoryLabel(r.preferredCategory, "fr"),
    en: r.suiteName ?? categoryLabel(r.preferredCategory, "en"),
    ar: r.suiteName ?? categoryLabel(r.preferredCategory, "ar"),
  };
  const ctx = { firstName: r.firstName, lastName: r.lastName, reference: r.reference, checkIn: r.checkIn, checkOut: r.checkOut, guests: r.guests };
  const defaultMessages = {
    confirmed: renderWhatsAppTemplate(templates.accept[guestLocale], { ...ctx, categoryLabel: labels[guestLocale] }, guestLocale),
    declined: renderWhatsAppTemplate(templates.decline[guestLocale], { ...ctx, categoryLabel: labels[guestLocale] }, guestLocale),
  };

  const info: [string, React.ReactNode][] = [
    ["Arrivée", formatDate(r.checkIn, "fr")],
    ["Départ", formatDate(r.checkOut, "fr")],
    ["Durée", `${nightsBetween(r.checkIn, r.checkOut)} nuit(s)`],
    ["Adultes", r.guests],
    ["Suites", r.rooms],
    ["Souhait", labels.fr],
  ];

  return (
    <>
      <Link href="/admin/reservations" className="mb-4 inline-block text-xs text-stone underline underline-offset-4">← Toutes les réservations</Link>
      <PageHeader
        title={`${r.firstName} ${r.lastName}`}
        description={`Référence ${r.reference} · reçue le ${r.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "long", timeStyle: "short" })}`}
        actions={<StatusBadge status={r.status} />}
      />

      {r.status === "pending" && (
        <p className="mb-6 rounded border border-[#f1dca8] bg-[#fff9ec] px-4 py-3 text-sm">
          Cette demande n’est <strong>pas</strong> une réservation confirmée tant qu’elle n’a pas été acceptée.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="a-card p-5" aria-labelledby="stay">
            <h2 id="stay" className="a-h2">Séjour demandé</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-3">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-stone">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {r.specialRequests && (
              <div className="mt-5 border-t border-[#f0ece4] pt-4">
                <h3 className="text-xs text-stone">Demandes particulières</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.specialRequests}</p>
              </div>
            )}
          </section>

          <section className="a-card p-5" aria-labelledby="guest">
            <h2 id="guest" className="a-h2">Client</h2>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-xs text-stone">Nom</dt><dd className="font-medium">{r.firstName} {r.lastName}</dd></div>
              <div><dt className="text-xs text-stone">Langue</dt><dd>{localeMeta[guestLocale].label}</dd></div>
              <div><dt className="text-xs text-stone">E-mail</dt><dd>{r.email || <span className="text-stone">—</span>}</dd></div>
              <div><dt className="text-xs text-stone">Téléphone</dt><dd><a className="underline underline-offset-4" href={`tel:${r.phone}`} dir="ltr">{formatPhoneDisplay(r.phone)}</a></dd></div>
              <div><dt className="text-xs text-stone">Consentement</dt><dd>{r.consentAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</dd></div>
            </dl>
          </section>

          {manage && (
            <section className="a-card p-5" aria-labelledby="decision">
              <h2 id="decision" className="a-h2">Décision</h2>
              {r.decidedAt && (
                <p className="mt-1 text-xs text-stone">
                  Décision le {r.decidedAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })} par {r.decidedByName ?? "—"}
                </p>
              )}
              <div className="mt-4">
                <StatusActions id={r.id} reference={r.reference} allowed={[...nextStatuses(r.status)]} defaultMessages={defaultMessages} />
              </div>
            </section>
          )}

          <section className="a-card p-5" aria-labelledby="history">
            <h2 id="history" className="a-h2">Historique</h2>
            <ol className="mt-4 space-y-4 border-s border-[#e8e3d9] ps-5">
              {r.history.map(({ h, actorName }) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -start-[25px] top-1.5 h-2 w-2 rounded-full bg-champagne" aria-hidden="true" />
                  <p>
                    <span className="font-medium">{historyLabels[h.action] ?? h.action}</span>
                    {h.fromStatus && h.toStatus && <> : {statusLabels[h.fromStatus]} → {statusLabels[h.toStatus]}</>}
                  </p>
                  <p className="text-xs text-stone">
                    {h.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "medium", timeStyle: "short" })} · {actorName ?? "Système"}
                  </p>
                  {h.message && <p className="mt-1 whitespace-pre-wrap rounded bg-[#fbfaf7] p-2 text-xs">{h.message}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          {manage && (
            <section className="a-card p-5" aria-labelledby="wa">
              <h2 id="wa" className="a-h2">WhatsApp</h2>
              <div className="mt-4">
                <WhatsAppPanel
                  reservationId={r.id}
                  phone={r.phone}
                  phoneDisplay={formatPhoneDisplay(r.phone)}
                  guestLocale={guestLocale}
                  ctx={ctx}
                  templates={templates}
                  categoryLabels={labels}
                />
              </div>
            </section>
          )}
          <section className="a-card p-5" aria-labelledby="notes">
            <h2 id="notes" className="a-h2">Notes internes</h2>
            {manage && <div className="mt-4"><NoteForm id={r.id} /></div>}
            <ul className="mt-4 space-y-3">
              {r.notes.length === 0 && <li className="text-sm text-stone">Aucune note.</li>}
              {r.notes.map(({ n, authorName }) => (
                <li key={n.id} className="rounded border border-[#f0ece4] p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-stone">{authorName ?? "—"} · {n.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" })}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
