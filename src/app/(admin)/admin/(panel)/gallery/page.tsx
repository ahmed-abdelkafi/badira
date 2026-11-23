import Image from "next/image";
import { requireAdmin } from "@/server/auth/dal";
import { listMediaOptions } from "@/server/services/admin-helpers";
import { PageHeader } from "@/components/admin/ui";
import { GalleryCaptionForm, UploadMediaForm } from "@/components/admin/MediaForms";
import { galleryAction } from "../media/actions";
import { listGalleryAdmin } from "@/server/services/content";
import { t } from "@/lib/localized";

export const metadata = { title: "Galerie" };

export default async function GalleryAdminPage() {
  await requireAdmin("content.manage");
  const [rows, media] = await Promise.all([listGalleryAdmin(), listMediaOptions()]);
  const inGallery = new Set(rows.map((r) => r.m.id));
  const available = media.filter((m) => !inGallery.has(m.id));

  return (
    <>
      <PageHeader title="Galerie" description="Ordre, légendes et visibilité des photos de la page Galerie et du défilé horizontal de l’accueil." actions={<a href="/fr/gallery" target="_blank" className="a-btn">Voir ↗</a>} />
      <section className="a-card mb-6 p-5">
        <h2 className="a-h2 mb-3">Importer de nouvelles photos dans la galerie</h2>
        <UploadMediaForm />
      </section>

      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ g, m }, i) => (
          <li key={g.id} className={`a-card overflow-hidden ${g.status !== "active" ? "opacity-60" : ""}`}>
            <div className="relative aspect-[3/2] bg-[#f3efe7]">
              <Image src={`/media/${m.storageKey}`} alt={t(m.alt, "fr")} fill sizes="400px" className="object-cover" />
              <span className="absolute start-2 top-2 rounded bg-charcoal/80 px-2 py-0.5 text-xs text-white">{i + 1}</span>
            </div>
            <div className="flex flex-wrap gap-1 p-3">
              <Op id={g.id} op="up" label="↑" disabled={i === 0} />
              <Op id={g.id} op="down" label="↓" disabled={i === rows.length - 1} />
              <Op id={g.id} op={g.status === "active" ? "hide" : "show"} label={g.status === "active" ? "Masquer" : "Afficher"} />
              <Op id={g.id} op="remove" label="Retirer de la galerie" />
            </div>
            <details className="border-t border-[#f0ece4] p-3">
              <summary className="cursor-pointer text-sm">{t(g.caption, "fr") || "Ajouter une légende"}</summary>
              <div className="mt-3"><GalleryCaptionForm id={g.id} caption={g.caption} category={g.category} /></div>
            </details>
          </li>
        ))}
      </ol>

      {available.length > 0 && (
        <section className="a-card mt-8 p-5">
          <h2 className="a-h2">Ajouter depuis la médiathèque</h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {available.map((m) => (
              <li key={m.id}>
                <form action={galleryAction}>
                  <input type="hidden" name="op" value="add" />
                  <input type="hidden" name="mediaId" value={m.id} />
                  <button className="group relative block aspect-[4/3] w-full overflow-hidden rounded border border-[#e8e3d9]" title={`Ajouter : ${m.alt}`}>
                    <Image src={m.src} alt={m.alt} fill sizes="160px" className="object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-charcoal/0 text-sm text-white opacity-0 transition group-hover:bg-charcoal/50 group-hover:opacity-100">+ Ajouter</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Op({ id, op, label, disabled }: { id: string; op: string; label: string; disabled?: boolean }) {
  return (
    <form action={galleryAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <button className="a-btn a-btn-sm" disabled={disabled}>{label}</button>
    </form>
  );
}
