import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/dal";
import { getCollection, listCollection } from "@/server/services/collections";
import { listMediaOptions } from "@/server/services/admin-helpers";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { itemOpAction } from "./actions";
import { t, type Localized } from "@/lib/localized";

export default async function CollectionPage({ params }: PageProps<"/admin/content/[kind]">) {
  await requireAdmin("content.manage");
  const { kind } = await params;
  const config = getCollection(kind);
  if (!config) notFound();
  const [rows, media] = await Promise.all([listCollection(config), listMediaOptions()]);
  const title = (r: Record<string, unknown>) => {
    const v = r[config.titleField];
    return typeof v === "string" ? v : t(v as Localized, "fr") || "(sans titre)";
  };

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={config.publicPath !== undefined && config.publicPath !== "" ? <a href={`/fr${config.publicPath}`} target="_blank" className="a-btn">Voir la page ↗</a> : undefined}
      />

      <details className="a-card mb-6 p-5">
        <summary className="cursor-pointer font-medium">+ Ajouter un {config.singular}</summary>
        <div className="mt-4">
          <CollectionForm kind={config.kind} fields={config.fields} media={media} />
        </div>
      </details>

      {rows.length === 0 ? (
        <EmptyState title={`Aucun ${config.singular} pour le moment.`} />
      ) : (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} className="a-card">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-xs tabular-nums text-stone">{i + 1}</span>
                    <span className="font-medium">{title(r)}</span>
                    {r.status !== "active" && <span className="a-badge border-[#dedad2] bg-[#f2f1ee] text-[#5f5950]">Masqué</span>}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <Op kind={config.kind} id={r.id} op="up" label="↑" disabled={i === 0} />
                    <Op kind={config.kind} id={r.id} op="down" label="↓" disabled={i === rows.length - 1} />
                    <Op kind={config.kind} id={r.id} op={r.status === "active" ? "deactivate" : "activate"} label={r.status === "active" ? "Masquer" : "Publier"} />
                    <span className="a-btn a-btn-sm">Modifier</span>
                  </span>
                </summary>
                <div className="border-t border-[#f0ece4] p-5">
                  <CollectionForm kind={config.kind} fields={config.fields} item={r} media={media} />
                  <form action={itemOpAction} className="mt-6 border-t border-[#f0ece4] pt-4">
                    <input type="hidden" name="kind" value={config.kind} />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="op" value="delete" />
                    <label className="flex items-center gap-2 text-xs text-stone">
                      <input type="checkbox" required /> Je confirme la suppression définitive
                    </label>
                    <button className="a-btn a-btn-sm a-btn-danger mt-2">Supprimer</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Op({ kind, id, op, label, disabled }: { kind: string; id: string; op: string; label: string; disabled?: boolean }) {
  return (
    <form action={itemOpAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <button className="a-btn a-btn-sm" disabled={disabled}>{label}</button>
    </form>
  );
}
