import Image from "next/image";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { mediaUsage } from "@/server/services/content";
import { PageHeader } from "@/components/admin/ui";
import { EditMediaForm, UploadMediaForm } from "@/components/admin/MediaForms";
import { mediaCategories } from "@/lib/media-categories";
import { t, isEmptyLocalized } from "@/lib/localized";

export const metadata = { title: "Médiathèque" };

export default async function MediaPage() {
  await requireAdmin("media.manage");
  const rows = await db().select().from(schema.mediaAssets).orderBy(desc(schema.mediaAssets.createdAt));
  const usage = await mediaUsage(rows.map((r) => r.id));
  const catLabel = Object.fromEntries(mediaCategories);

  return (
    <>
      <PageHeader title="Médiathèque" description={`${rows.length} image(s). Les images sont optimisées automatiquement (AVIF/WebP, tailles adaptées).`} />
      <section className="a-card mb-6 p-5">
        <UploadMediaForm />
      </section>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((m) => (
          <li key={m.id} className="a-card overflow-hidden">
            <div className="relative aspect-[3/2] bg-[#f3efe7]">
              <Image src={`/media/${m.storageKey}`} alt={t(m.alt, "fr")} fill sizes="(min-width: 1280px) 33vw, 50vw" className="object-cover" />
            </div>
            <details className="p-4">
              <summary className="cursor-pointer">
                <span className="text-sm font-medium">{t(m.alt, "fr") || m.originalName.replace(/^seed:/, "")}</span>
                <span className="mt-1 block text-xs text-stone">
                  {catLabel[m.category] ?? m.category} · {m.width}×{m.height} · {(m.bytes / 1024).toFixed(0)} Ko
                  {isEmptyLocalized(m.alt) && <span className="ms-2 text-[#8a5a00]">⚠ texte alternatif manquant</span>}
                </span>
              </summary>
              <div className="mt-4">
                <EditMediaForm id={m.id} alt={m.alt} category={m.category} usage={usage.get(m.id) ?? []} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
