"use client";

import { useActionState } from "react";
import type { Localized } from "@/lib/localized";
import type { ActionState } from "@/server/services/admin-helpers";
import { deleteMediaAction, galleryCaptionAction, updateMediaAction, uploadMediaAction } from "@/app/(admin)/admin/(panel)/media/actions";
import { Feedback, LocalizedField, SubmitButton } from "./fields";
import { mediaCategories } from "@/lib/media-categories";


function CategorySelect({ id, value }: { id: string; value?: string }) {
  return (
    <select id={id} name="category" defaultValue={value ?? "general"} className="a-input">
      {mediaCategories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function UploadMediaForm({ withGalleryOption = true }: { withGalleryOption?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(uploadMediaAction, {});
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
      <div>
        <label className="a-label" htmlFor="up-files">Images (JPEG, PNG, WebP, AVIF · 15 Mo max · 20 fichiers)</label>
        <input id="up-files" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic" required className="text-sm" />
      </div>
      <div>
        <label className="a-label" htmlFor="up-cat">Catégorie</label>
        <CategorySelect id="up-cat" />
      </div>
      <SubmitButton>Importer</SubmitButton>
      {withGalleryOption && (
        <label className="flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox" name="gallery" /> Ajouter aussi à la galerie publique
        </label>
      )}
      <div className="md:col-span-3"><Feedback state={state} />{state.ok && state.error && <p className="text-xs text-stone">{state.message}</p>}</div>
    </form>
  );
}

export function EditMediaForm({ id, alt, category, usage }: { id: string; alt: Localized; category: string; usage: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(updateMediaAction, {});
  const [delState, delAction] = useActionState<ActionState, FormData>(deleteMediaAction, {});
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <LocalizedField name="alt" label="Texte alternatif (accessibilité & SEO)" value={alt} maxLength={300} hint="Décrivez ce que montre l’image, sans « image de »." />
        <div>
          <label className="a-label" htmlFor={`cat-${id}`}>Catégorie</label>
          <CategorySelect id={`cat-${id}`} value={category} />
        </div>
        <div>
          <label className="a-label" htmlFor={`rep-${id}`}>Remplacer le fichier (mise à jour partout)</label>
          <input id={`rep-${id}`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="text-sm" />
        </div>
        <SubmitButton>Enregistrer</SubmitButton>
        <Feedback state={state} />
      </form>
      <div className="border-t border-[#f0ece4] pt-3 text-xs">
        <p className="text-stone">Utilisée : {usage.length ? usage.join(", ") : "nulle part"}</p>
        <form action={delAction} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-center gap-2 text-stone"><input type="checkbox" required /> Confirmer la suppression définitive</label>
          <SubmitButton className="a-btn a-btn-sm a-btn-danger mt-2">Supprimer</SubmitButton>
        </form>
        <Feedback state={delState} />
      </div>
    </div>
  );
}

export function GalleryCaptionForm({ id, caption, category }: { id: string; caption: Localized; category: string }) {
  const [state, action] = useActionState<ActionState, FormData>(galleryCaptionAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <LocalizedField name="caption" label="Légende" value={caption} maxLength={300} />
      <div>
        <label className="a-label" htmlFor={`gcat-${id}`}>Filtre</label>
        <CategorySelect id={`gcat-${id}`} value={category} />
      </div>
      <SubmitButton className="a-btn a-btn-sm">Enregistrer</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
