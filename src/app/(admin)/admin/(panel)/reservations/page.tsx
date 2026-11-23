import Link from "next/link";
import { requireAdmin } from "@/server/auth/dal";
import { listReservations, type ReservationFilters } from "@/server/services/reservations";
import { db, schema } from "@/server/db";
import { reservationStatuses, type ReservationStatus } from "@/lib/reservation-status";
import { categoryLabel } from "@/lib/categories";
import { formatDate, nightsBetween, ISO_DATE } from "@/lib/dates";
import { formatPhoneDisplay } from "@/lib/phone";
import { EmptyState, PageHeader, StatusBadge, statusLabels } from "@/components/admin/ui";

export const metadata = { title: "Réservations" };

const sorts = {
  created_desc: "Plus récentes",
  created_asc: "Plus anciennes",
  checkin_asc: "Arrivée la plus proche",
  checkin_desc: "Arrivée la plus lointaine",
} as const;

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  await requireAdmin("reservations.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = str("status");
  const filters: ReservationFilters = {
    q: str("q")?.slice(0, 100),
    status: status && (reservationStatuses as readonly string[]).includes(status) ? (status as ReservationStatus) : "all",
    from: str("from") && ISO_DATE.test(str("from")!) ? str("from") : undefined,
    to: str("to") && ISO_DATE.test(str("to")!) ? str("to") : undefined,
    sort: (str("sort") as ReservationFilters["sort"]) && str("sort")! in sorts ? (str("sort") as ReservationFilters["sort"]) : "created_desc",
    page: Math.max(1, Number(str("page") ?? 1) || 1),
  };
  const [result, suites] = await Promise.all([
    listReservations(filters),
    db().select({ slug: schema.suites.slug, name: schema.suites.name }).from(schema.suites),
  ]);
  const suiteNames = Object.fromEntries(suites.map((s) => [s.slug, s.name]));
  const qs = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: filters.q, status: filters.status === "all" ? undefined : filters.status, from: filters.from, to: filters.to, sort: filters.sort, page: filters.page, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1) && !(k === "sort" && v === "created_desc")) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader title="Réservations" description={`${result.total} demande${result.total > 1 ? "s" : ""}`} />

      <nav aria-label="Filtrer par statut" className="mb-4 flex flex-wrap gap-2">
        {(["all", ...reservationStatuses] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/reservations${qs({ status: s === "all" ? undefined : s, page: 1 })}`}
            aria-current={filters.status === s ? "page" : undefined}
            className={`a-btn a-btn-sm ${filters.status === s ? "a-btn-primary" : ""}`}
          >
            {s === "all" ? "Toutes" : statusLabels[s]}
          </Link>
        ))}
      </nav>

      <form className="a-card mb-6 grid gap-4 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end" role="search">
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <div>
          <label className="a-label" htmlFor="q">Recherche</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Référence, nom, e-mail, téléphone" className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="from">Arrivée à partir du</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="to">Arrivée jusqu’au</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="sort">Tri</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="a-input">
            {Object.entries(sorts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="a-btn a-btn-primary">Filtrer</button>
          <Link href="/admin/reservations" className="a-btn">Réinitialiser</Link>
        </div>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState title="Aucune demande ne correspond à ces critères." />
      ) : (
        <div className="a-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="a-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">Référence</th>
                  <th scope="col">Client</th>
                  <th scope="col">Séjour</th>
                  <th scope="col">Pers.</th>
                  <th scope="col">Souhait</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Reçue le</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/admin/reservations/${r.id}`} className="font-mono text-xs font-medium underline underline-offset-4">{r.reference}</Link></td>
                    <td>
                      <div className="font-medium">{r.firstName} {r.lastName}</div>
                      <div className="text-xs text-stone"><span dir="ltr">{formatPhoneDisplay(r.phone)}</span>{r.email ? ` · ${r.email}` : ""}</div>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {formatDate(r.checkIn, "fr", "medium")} → {formatDate(r.checkOut, "fr", "medium")}
                      <div className="text-stone">{nightsBetween(r.checkIn, r.checkOut)} nuit(s)</div>
                    </td>
                    <td className="tabular-nums">{r.guests} / {r.rooms} ste</td>
                    <td className="text-xs">{categoryLabel(r.preferredCategory, "fr", suiteNames)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap text-xs text-stone">{r.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-[#e8e3d9] p-3 text-sm">
              <span className="text-stone">Page {result.page} / {result.pages}</span>
              <span className="flex gap-2">
                {result.page > 1 && <Link className="a-btn a-btn-sm" href={`/admin/reservations${qs({ page: result.page - 1 })}`}>Précédente</Link>}
                {result.page < result.pages && <Link className="a-btn a-btn-sm" href={`/admin/reservations${qs({ page: result.page + 1 })}`}>Suivante</Link>}
              </span>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
