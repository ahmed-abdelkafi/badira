import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Journal d’activité" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin("audit.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? sql`lower(${schema.auditLogs.action}) LIKE ${`%${q.toLowerCase().replace(/[%_\\]/g, "")}%`}` : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db()
      .select({ a: schema.auditLogs, actor: schema.adminUsers.name })
      .from(schema.auditLogs)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.auditLogs.actorId))
      .where(where)
      .orderBy(desc(schema.auditLogs.id))
      .limit(PAGE)
      .offset((page - 1) * PAGE),
    db().select({ total: sql<number>`count(*)` }).from(schema.auditLogs).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Journal d’activité" description="Qui a fait quoi, et quand. Les secrets, mots de passe et codes ne sont jamais journalisés." />
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Filtrer par action (ex. reservation, auth, suite)" className="a-input max-w-sm" />
        <button className="a-btn">Filtrer</button>
      </form>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[800px]">
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Détails</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map(({ a, actor }) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-xs">{a.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</td>
                <td>{actor ?? "Système"}</td>
                <td className="font-mono text-xs">{a.action}</td>
                <td className="text-xs">
                  {a.entityType === "reservation" && a.entityId ? <Link className="underline" href={`/admin/reservations/${a.entityId}`}>réservation</Link> : a.entityType ?? "—"}
                </td>
                <td className="max-w-xs truncate font-mono text-[0.7rem] text-stone">{Object.keys(a.meta).length ? JSON.stringify(a.meta) : ""}</td>
                <td className="text-xs text-stone">{a.ip ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-3 flex justify-between text-sm" aria-label="Pagination">
          <span className="text-stone">Page {page} / {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className="a-btn a-btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>Précédente</Link>}
            {page < pages && <Link className="a-btn a-btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Suivante</Link>}
          </span>
        </nav>
      )}
    </>
  );
}
