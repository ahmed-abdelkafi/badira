"use client";

import { useActionState } from "react";
import type { Localized } from "@/lib/localized";
import type { ActionState } from "@/server/services/admin-helpers";
import { savePageAction } from "@/app/(admin)/admin/(panel)/pages/actions";
import { HOME_SECTIONS } from "@/server/services/pages-config";
import { Feedback, LocalizedField, MediaPicker, SubmitButton, type MediaOption } from "./fields";

type SectionValue = { visible?: boolean; imageId?: string | null; eyebrow?: Localized; title?: Localized; body?: Localized };

export function PageForm({
  pageKey,
  seoTitle,
  seoDescription,
  heroImageId,
  ogImageId,
  sections,
  media,
}: {
  pageKey: string;
  seoTitle: Localized;
  seoDescription: Localized;
  heroImageId: string | null;
  ogImageId: string | null;
  sections: Record<string, SectionValue>;
  media: MediaOption[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(savePageAction, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="key" value={pageKey} />
      <div className="grid gap-4 md:grid-cols-2">
        <LocalizedField name="seoTitle" label="Titre SEO (≈60 caractères)" value={seoTitle} maxLength={120} hint="Vide = titre par défaut de la page." />
        <LocalizedField name="seoDescription" label="Description SEO (≈155 caractères)" value={seoDescription} multiline rows={2} maxLength={320} />
        <MediaPicker name="heroImageId" label="Image d’en-tête" media={media} value={heroImageId} />
        <MediaPicker name="ogImageId" label="Image de partage (réseaux sociaux)" media={media} value={ogImageId} />
      </div>

      {pageKey === "home" && (
        <div className="space-y-3">
          <h3 className="a-h2">Sections de l’accueil</h3>
          <p className="text-xs text-stone">Les textes laissés vides utilisent la traduction par défaut. Les sections sans contenu (ex. témoignages) restent masquées automatiquement.</p>
          {HOME_SECTIONS.map((s) => {
            const v = sections[s.key] ?? {};
            return (
              <details key={s.key} className="rounded border border-[#e8e3d9] bg-[#fbfaf7]">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <span className="font-medium">{s.label}</span>
                  <label className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" name={`sec.${s.key}.visible`} defaultChecked={v.visible !== false} /> Visible
                  </label>
                </summary>
                <div className="grid gap-4 border-t border-[#e8e3d9] bg-white p-4 md:grid-cols-2">
                  {s.image && <div className="md:col-span-2"><MediaPicker name={`sec.${s.key}.imageId`} label="Image" media={media} value={v.imageId ?? null} /></div>}
                  <LocalizedField name={`sec.${s.key}.eyebrow`} label="Surtitre" value={v.eyebrow} maxLength={120} />
                  <LocalizedField name={`sec.${s.key}.title`} label="Titre" value={v.title} maxLength={200} />
                  <div className="md:col-span-2"><LocalizedField name={`sec.${s.key}.body`} label="Texte" value={v.body} multiline rows={3} maxLength={1200} /></div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Enregistrer et publier</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}
