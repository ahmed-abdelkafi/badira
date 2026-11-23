import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/dal";
import { listSuitesAdmin } from "@/server/services/content";
import { PageHeader } from "@/components/admin/ui";
import { moveSuiteAction, suiteStatusAction } from "./actions";
import { t } from "@/lib/localized";

export const metadata = { title: "Suites" };

const statusLabel = { active: "Active", inactive: "Inactive", archived: "Archivée" } as const;
const statusCls = {
  active: "border-[#c6e6d2] bg-[#eaf6ef] text-[#1f6f43]",
  inactive: "border-[#dedad2] bg-[#f2f1ee] text-[#5f5950]",
  archived: "border-[#dedad2] bg-[#f2f1ee] text-[#5f5950] line-through",
} as const;

export default async function SuitesAdminPage() {
  await requireAdmin("content.manage");
  const rows = await listSuitesAdmin();

  return (
    <>
      <PageHeader
        title="Suites"
        description="Ordre d’affichage, visibilité et contenu des suites. Les modifications sont publiées immédiatement."
        actions={<Link href="/admin/suites/new" className="a-btn a-btn-primary">Nouvelle suite</Link>}
      />
      <div className="a-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="a-table min-w-[820px]">
            <thead>
              <tr><th>Ordre</th><th>Suite</th><th>Collection</th><th>Surface</th><th>Photos</th><th>Statut</th><th className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(({ s, img, imageCount }, i) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex gap-1">
                      <form action={moveSuiteAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" /><button className="a-btn a-btn-sm" disabled={i === 0} aria-label={`Monter ${s.name}`}>↑</button></form>
                      <form action={moveSuiteAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" /><button className="a-btn a-btn-sm" disabled={i === rows.length - 1} aria-label={`Descendre ${s.name}`}>↓</button></form>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-[#f3efe7]">
                        {img && <Image src={`/media/${img}`} alt="" fill sizes="56px" className="object-cover" />}
                      </div>
                      <div>
                        <Link href={`/admin/suites/${s.id}`} className="font-medium underline-offset-4 hover:underline">{s.name}</Link>
                        <div className="text-xs text-stone">{t(s.tagline, "fr")}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs">{s.collection === "legend" ? "Légende" : "Standard"} · {s.inventoryCategory}</td>
                  <td className="tabular-nums">{s.areaSqm ? `${s.areaSqm} m²` : <span className="text-stone">—</span>}</td>
                  <td className="tabular-nums">{imageCount}</td>
                  <td><span className={`a-badge ${statusCls[s.status]}`}>{statusLabel[s.status]}</span></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <form action={suiteStatusAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value={s.status === "active" ? "inactive" : "active"} />
                        <button className="a-btn a-btn-sm">{s.status === "active" ? "Désactiver" : "Activer"}</button>
                      </form>
                      <Link href={`/admin/suites/${s.id}`} className="a-btn a-btn-sm">Modifier</Link>
                      {s.status === "active" && <a href={`/fr/suites/${s.slug}`} target="_blank" className="a-btn a-btn-sm">Voir ↗</a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
