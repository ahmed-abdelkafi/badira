import Link from "next/link";
import { can, requireAdmin } from "@/server/auth/dal";
import { reservationStats, recentActivity } from "@/server/services/reservations";
import { db, schema } from "@/server/db";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState, PageHeader, StatTile, StatusBadge } from "@/components/admin/ui";
import { env, pushConfigured } from "@/server/env";
import { NotificationBanner } from "@/components/admin/PushToggle";

export const metadata = { title: "Tableau de bord" };

const actionLabels: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.logout": "Déconnexion",
  "auth.login_failed": "Échec de connexion",
  "auth.2fa_failed": "Échec 2FA",
  "auth.2fa_enabled": "2FA activée",
  "auth.2fa_reset": "2FA réinitialisée",
  "reservation.confirmed": "Réservation acceptée",
  "reservation.declined": "Réservation refusée",
  "reservation.cancelled": "Réservation annulée",
  "reservation.completed": "Séjour terminé",
};

export default async function DashboardPage() {
  const user = await requireAdmin();
  if (!can(user, "reservations.view")) {
    return (
      <>
        <PageHeader title={`Bonjour ${user.name.split(" ")[0]}`} description="Gérez les contenus du site depuis le menu." />
        <EmptyState title="Aucune donnée de réservation pour votre rôle" />
      </>
    );
  }
  const [stats, activity, suites] = await Promise.all([
    reservationStats(),
    can(user, "audit.view") ? recentActivity(10) : Promise.resolve([]),
    db().select({ slug: schema.suites.slug, name: schema.suites.name }).from(schema.suites),
  ]);
  const suiteNames = Object.fromEntries(suites.map((s) => [s.slug, s.name]));
  const trend = stats.trend.map((d) => ({ label: d.day.slice(5).split("-").reverse().join("/"), fullLabel: formatDate(d.day, "fr"), value: d.n }));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        description="Vue d’ensemble des demandes de réservation."
        actions={<Link href="/admin/reservations?status=pending" className="a-btn a-btn-primary">Traiter les demandes en attente</Link>}
      />

      {pushConfigured() && <NotificationBanner vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? env().VAPID_PUBLIC_KEY} />}
      {!pushConfigured() && (
        <div className="mb-6 space-y-2 text-sm">
          {!pushConfigured() && <p className="rounded border border-[#f1dca8] bg-[#fff9ec] px-4 py-2">Notifications push non configurées (clés VAPID absentes).</p>}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Indicateurs">
        <StatTile label="Total" value={stats.total} href="/admin/reservations" />
        <StatTile label="En attente" value={stats.counts.pending} href="/admin/reservations?status=pending" />
        <StatTile label="Confirmées" value={stats.counts.confirmed} href="/admin/reservations?status=confirmed" />
        <StatTile label="Refusées" value={stats.counts.declined} href="/admin/reservations?status=declined" />
        <StatTile label="Annulées / terminées" value={`${stats.counts.cancelled} / ${stats.counts.completed}`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BarChart title="Demandes reçues — 30 derniers jours" data={trend} />
        </div>
        <BarChart
          title="Demandes par catégorie souhaitée"
          orientation="horizontal"
          data={stats.byCategory.map((c) => ({ label: categoryLabel(c.category, "fr", suiteNames), value: c.n }))}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="a-card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-5">
            <h2 className="a-h2">Demandes récentes</h2>
            <Link href="/admin/reservations" className="text-xs underline underline-offset-4">Tout voir</Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-stone">Aucune demande pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="a-table">
                <thead>
                  <tr><th>Référence</th><th>Client</th><th>Séjour</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/admin/reservations/${r.id}`} className="font-mono text-xs underline underline-offset-4">{r.reference}</Link></td>
                      <td>{r.firstName} {r.lastName}</td>
                      <td className="whitespace-nowrap text-xs">{formatDate(r.checkIn, "fr", "medium")} → {formatDate(r.checkOut, "fr", "medium")}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="a-card p-5">
          <h2 className="a-h2">Activité administrative récente</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-stone">{can(user, "audit.view") ? "Aucune activité." : "Réservé aux responsables."}</p>
          ) : (
            <ol className="mt-4 space-y-3 text-sm">
              {activity.map(({ a, actorName }) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    <span className="font-medium">{actorName ?? "Système"}</span> — {actionLabels[a.action] ?? a.action}
                    {typeof a.meta?.reference === "string" && <span className="font-mono text-xs"> {a.meta.reference}</span>}
                  </span>
                  <time className="shrink-0 text-xs text-stone" dateTime={a.createdAt.toISOString()}>
                    {a.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
