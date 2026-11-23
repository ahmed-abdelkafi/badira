import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/dal";
import { getSuiteAdmin } from "@/server/services/content";
import { Notice, PageHeader } from "@/components/admin/ui";
import { DeleteSuiteForm, SuiteForm, SuiteUploadForm } from "@/components/admin/SuiteForms";
import { suiteImageAction, suiteStatusAction } from "../actions";
import { t } from "@/lib/localized";

export const metadata = { title: "Modifier une suite" };

export default async function EditSuitePage({ params, searchParams }: PageProps<"/admin/suites/[id]">) {
  await requireAdmin("content.manage");
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const suite = await getSuiteAdmin(id);
  if (!suite) notFound();

  return (
    <>
      <Link href="/admin/suites" className="mb-4 inline-block text-xs text-stone underline underline-offset-4">← Toutes les suites</Link>
      <PageHeader
        title={suite.name}
        description={`/${"fr"}/suites/${suite.slug}`}
        actions={
          <>
            {suite.status === "active" && <a href={`/fr/suites/${suite.slug}`} target="_blank" className="a-btn">Prévisualiser ↗</a>}
            <form action={suiteStatusAction}>
              <input type="hidden" name="id" value={suite.id} />
              <input type="hidden" name="status" value={suite.status === "archived" ? "inactive" : "archived"} />
              <button className="a-btn">{suite.status === "archived" ? "Désarchiver" : "Archiver"}</button>
            </form>
          </>
        }
      />
      {created && <div className="mb-6"><Notice tone="success">Suite créée. Ajoutez maintenant des photos.</Notice></div>}
      {suite.internalNotes && <div className="mb-6"><Notice tone="warning"><strong>Note interne :</strong> {suite.internalNotes}</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <SuiteForm suite={{ ...suite }} />

        <aside className="space-y-6">
          <section className="a-card p-5" aria-labelledby="photos">
            <h2 id="photos" className="a-h2">Photos ({suite.images.length})</h2>
            <p className="mt-1 text-xs text-stone">La photo « principale » illustre la suite dans les listes et en en-tête.</p>
            <ul className="mt-4 space-y-3">
              {suite.images.map((img, i) => (
                <li key={img.mediaId} className="flex gap-3">
                  <div className={`relative h-16 w-24 shrink-0 overflow-hidden rounded border-2 ${suite.mainImageId === img.mediaId ? "border-champagne" : "border-transparent"}`}>
                    <Image src={`/media/${img.m.storageKey}`} alt={t(img.m.alt, "fr")} fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-stone">{t(img.m.alt, "fr") || img.m.originalName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suite.mainImageId === img.mediaId ? (
                        <span className="a-badge border-[#e6d9bf] bg-[#fbf6ea]">Principale</span>
                      ) : (
                        <ImgOp suiteId={suite.id} mediaId={img.mediaId} op="main" label="Principale" />
                      )}
                      <ImgOp suiteId={suite.id} mediaId={img.mediaId} op="up" label="↑" disabled={i === 0} />
                      <ImgOp suiteId={suite.id} mediaId={img.mediaId} op="down" label="↓" disabled={i === suite.images.length - 1} />
                      <ImgOp suiteId={suite.id} mediaId={img.mediaId} op="remove" label="Retirer" />
                    </div>
                  </div>
                </li>
              ))}
              {suite.images.length === 0 && <li className="text-sm text-stone">Aucune photo. Le site affiche un monogramme en attendant.</li>}
            </ul>
            <div className="mt-5 border-t border-[#f0ece4] pt-4">
              <SuiteUploadForm suiteId={suite.id} />
            </div>
            <p className="mt-3 text-xs text-stone">Les photos retirées restent dans la médiathèque.</p>
          </section>

          {suite.status === "archived" && (
            <section className="a-card p-5">
              <h2 className="a-h2 text-[#b42318]">Zone sensible</h2>
              <p className="mt-1 mb-3 text-xs text-stone">La suppression est définitive. Elle est refusée si des demandes de réservation font référence à cette suite.</p>
              <DeleteSuiteForm id={suite.id} />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function ImgOp({ suiteId, mediaId, op, label, disabled }: { suiteId: string; mediaId: string; op: string; label: string; disabled?: boolean }) {
  return (
    <form action={suiteImageAction}>
      <input type="hidden" name="suiteId" value={suiteId} />
      <input type="hidden" name="mediaId" value={mediaId} />
      <input type="hidden" name="op" value={op} />
      <button className="a-btn a-btn-sm" disabled={disabled}>{label}</button>
    </form>
  );
}
