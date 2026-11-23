"use client";

import { useActionState } from "react";
import type { Localized } from "@/lib/localized";
import { deleteSuiteAction, saveSuiteAction, uploadSuiteImagesAction } from "@/app/(admin)/admin/(panel)/suites/actions";
import type { ActionState } from "@/server/services/admin-helpers";
import { Feedback, LocalizedField, SubmitButton } from "./fields";

export type SuiteFormValues = {
  id?: string;
  slug: string;
  name: string;
  collection: "standard" | "legend";
  inventoryCategory: "fell" | "yasmine" | "nour" | "legend";
  status: "active" | "inactive" | "archived";
  tagline: Localized;
  description: Localized;
  areaSqm: number | null;
  maxOccupancy: number | null;
  bedConfiguration: Localized;
  view: string | null;
  viewDetails: Localized;
  amenities: Localized[];
  features: Localized[];
  seoTitle: Localized;
  seoDescription: Localized;
  internalNotes: string | null;
};

export function SuiteForm({ suite }: { suite: SuiteFormValues }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSuiteAction, {});
  return (
    <form action={action} className="space-y-6">
      {suite.id && <input type="hidden" name="id" value={suite.id} />}
      <Feedback state={state} />

      <section className="a-card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="a-h2 md:col-span-2">Identité</h2>
        <div>
          <label className="a-label" htmlFor="name">Nom (jamais traduit)</label>
          <input id="name" name="name" required maxLength={120} defaultValue={suite.name} className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="slug">Identifiant d’URL</label>
          <input id="slug" name="slug" maxLength={80} pattern="[a-z0-9-]*" defaultValue={suite.slug} placeholder="généré depuis le nom" className="a-input font-mono" />
          <p className="mt-1 text-xs text-stone">Modifier l’URL d’une suite publiée casse les liens existants.</p>
        </div>
        <div>
          <label className="a-label" htmlFor="collection">Collection commerciale</label>
          <select id="collection" name="collection" defaultValue={suite.collection} className="a-input">
            <option value="standard">Suites Standard</option>
            <option value="legend">Suites Légende</option>
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="inventoryCategory">Catégorie d’inventaire officielle</label>
          <select id="inventoryCategory" name="inventoryCategory" defaultValue={suite.inventoryCategory} className="a-input">
            <option value="fell">Fell</option>
            <option value="yasmine">Yasmine</option>
            <option value="nour">Nour</option>
            <option value="legend">Legend</option>
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="status">Visibilité</label>
          <select id="status" name="status" defaultValue={suite.status} className="a-input">
            <option value="active">Active (visible sur le site)</option>
            <option value="inactive">Inactive (masquée)</option>
            <option value="archived">Archivée</option>
          </select>
        </div>
      </section>

      <section className="a-card space-y-4 p-5">
        <h2 className="a-h2">Textes</h2>
        <LocalizedField name="tagline" label="Accroche" value={suite.tagline} maxLength={300} />
        <LocalizedField name="description" label="Description" value={suite.description} multiline rows={6} maxLength={5000} />
        <LocalizedField name="features" label="Particularités" value={suite.features} list />
        <LocalizedField name="amenities" label="Équipements" value={suite.amenities} list />
      </section>

      <section className="a-card grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="a-h2">Caractéristiques</h2>
          <p className="mt-1 text-xs text-stone">Laissez vide toute information non vérifiée : elle ne sera pas affichée sur le site.</p>
        </div>
        <div>
          <label className="a-label" htmlFor="areaSqm">Surface (m²)</label>
          <input id="areaSqm" name="areaSqm" type="number" min={1} max={5000} defaultValue={suite.areaSqm ?? ""} className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="maxOccupancy">Capacité maximale (personnes)</label>
          <input id="maxOccupancy" name="maxOccupancy" type="number" min={1} max={50} defaultValue={suite.maxOccupancy ?? ""} className="a-input" />
        </div>
        <div>
          <label className="a-label" htmlFor="view">Type de vue</label>
          <select id="view" name="view" defaultValue={suite.view ?? ""} className="a-input">
            <option value="">Non précisé</option>
            <option value="sea">Mer</option>
            <option value="pool_and_sea">Piscine et mer</option>
            <option value="partial_sea">Mer partielle</option>
            <option value="garden">Jardin</option>
          </select>
        </div>
        <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
          <LocalizedField name="viewDetails" label="Précisions sur la vue" value={suite.viewDetails} maxLength={300} />
          <LocalizedField name="bedConfiguration" label="Literie" value={suite.bedConfiguration} maxLength={200} />
        </div>
      </section>

      <section className="a-card space-y-4 p-5">
        <h2 className="a-h2">Référencement (SEO)</h2>
        <LocalizedField name="seoTitle" label="Titre de la page" value={suite.seoTitle} maxLength={120} hint="Par défaut : le nom de la suite." />
        <LocalizedField name="seoDescription" label="Description (≈155 caractères)" value={suite.seoDescription} multiline rows={2} maxLength={320} />
      </section>

      <section className="a-card p-5">
        <label className="a-label" htmlFor="internalNotes">Notes internes (jamais publiées)</label>
        <textarea id="internalNotes" name="internalNotes" rows={3} maxLength={4000} defaultValue={suite.internalNotes ?? ""} className="a-input" />
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-[#e8e3d9] bg-[#f7f5f0]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <SubmitButton>{suite.id ? "Enregistrer" : "Créer la suite"}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function SuiteUploadForm({ suiteId }: { suiteId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(uploadSuiteImagesAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="suiteId" value={suiteId} />
      <label className="a-label" htmlFor="files">Ajouter des photos (JPEG, PNG, WebP, AVIF · 15 Mo max chacune)</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id="files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple className="text-sm" />
        <SubmitButton className="a-btn">Téléverser</SubmitButton>
      </div>
      <Feedback state={state} />
      {state.ok && state.error && <p className="text-xs text-stone">{state.message}</p>}
    </form>
  );
}

export function DeleteSuiteForm({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteSuiteAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const typed = (e.currentTarget.elements.namedItem("confirm") as HTMLInputElement).value;
        if (typed !== "SUPPRIMER") e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <label className="a-label" htmlFor="confirm-del">Tapez SUPPRIMER pour confirmer la suppression définitive</label>
      <div className="flex gap-2">
        <input id="confirm-del" name="confirm" className="a-input max-w-48" autoComplete="off" />
        <SubmitButton className="a-btn a-btn-danger">Supprimer définitivement</SubmitButton>
      </div>
      <Feedback state={state} />
    </form>
  );
}
