import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { ContentError, readInt, readLocalized, readUrl, readUuid, slugify } from "./content";
import { TAGS } from "@/server/content/queries";
import { isEmptyLocalized } from "@/lib/localized";

/**
 * Config-driven CRUD for simple content collections. Each field type maps to
 * a parser; the admin UI renders the same config.
 */
export type FieldDef =
  | { name: string; label: string; type: "text"; required?: boolean; max?: number; hint?: string }
  | { name: string; label: string; type: "localized"; required?: boolean; multiline?: boolean; max?: number; hint?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { name: string; label: string; type: "int"; min: number; max: number }
  | { name: string; label: string; type: "url" }
  | { name: string; label: string; type: "date" }
  | { name: string; label: string; type: "media" };

type Table =
  | typeof schema.restaurants
  | typeof schema.spaServices
  | typeof schema.experiences
  | typeof schema.eventOfferings
  | typeof schema.testimonials;

export type CollectionConfig = {
  kind: string;
  title: string;
  singular: string;
  description: string;
  table: Table;
  tag: string;
  fields: FieldDef[];
  /** Column used as the row title in lists. */
  titleField: string;
  /** Derive `slug` from this field on create. */
  slugFrom?: string;
  publicPath?: string;
  defaultStatus?: "active" | "inactive";
};

export const collections: Record<string, CollectionConfig> = {
  restaurants: {
    kind: "restaurants",
    title: "Restaurants & bars",
    singular: "lieu",
    description: "Restaurants et bars présentés sur la page Gastronomie et sur l’accueil.",
    table: schema.restaurants,
    tag: TAGS.restaurants,
    titleField: "name",
    slugFrom: "name",
    publicPath: "/dining",
    fields: [
      { name: "name", label: "Nom (jamais traduit)", type: "text", required: true, max: 80 },
      { name: "kind", label: "Type", type: "select", options: [{ value: "restaurant", label: "Restaurant" }, { value: "bar", label: "Bar" }] },
      { name: "cuisine", label: "Cuisine / sous-titre", type: "localized", max: 200 },
      { name: "description", label: "Description", type: "localized", multiline: true, max: 2000 },
      { name: "hours", label: "Horaires", type: "text", max: 60, hint: "Ex. 12:00 – 00:00" },
      { name: "season", label: "Saison / service", type: "localized", max: 120 },
      { name: "closedDays", label: "Fermeture", type: "localized", max: 120 },
      { name: "menuUrl", label: "Lien vers la carte (PDF)", type: "url" },
      { name: "imageId", label: "Photo", type: "media" },
    ],
  },
  spa: {
    kind: "spa",
    title: "Spa",
    singular: "élément",
    description: "Espaces et soins du Spa by Clarins.",
    table: schema.spaServices,
    tag: TAGS.spa,
    titleField: "title",
    publicPath: "/spa",
    fields: [
      { name: "kind", label: "Type", type: "select", options: [{ value: "facility", label: "Espace / installation" }, { value: "treatment", label: "Soin" }] },
      { name: "title", label: "Titre", type: "localized", required: true, max: 120 },
      { name: "description", label: "Description", type: "localized", multiline: true, max: 1000 },
      { name: "durationMinutes", label: "Durée (minutes, soins)", type: "int", min: 5, max: 600 },
      { name: "imageId", label: "Photo", type: "media" },
    ],
  },
  experiences: {
    kind: "experiences",
    title: "Expériences",
    singular: "expérience",
    description: "Conciergerie, activités culturelles et sportives.",
    table: schema.experiences,
    tag: TAGS.experiences,
    titleField: "title",
    slugFrom: "title",
    publicPath: "/experiences",
    fields: [
      { name: "title", label: "Titre", type: "localized", required: true, max: 120 },
      { name: "description", label: "Description", type: "localized", multiline: true, max: 2000 },
      { name: "imageId", label: "Photo", type: "media" },
    ],
  },
  events: {
    kind: "events",
    title: "Événements & mariages",
    singular: "offre",
    description: "Offres mariage, séminaires et événements privés.",
    table: schema.eventOfferings,
    tag: TAGS.events,
    titleField: "title",
    slugFrom: "title",
    publicPath: "/events",
    fields: [
      { name: "kind", label: "Type", type: "select", options: [{ value: "wedding", label: "Mariage" }, { value: "business", label: "Professionnel" }, { value: "private", label: "Privé" }] },
      { name: "title", label: "Titre", type: "localized", required: true, max: 120 },
      { name: "description", label: "Description", type: "localized", multiline: true, max: 2000 },
      { name: "brochureUrl", label: "Lien vers la brochure", type: "url" },
      { name: "imageId", label: "Photo", type: "media" },
    ],
  },
  testimonials: {
    kind: "testimonials",
    title: "Témoignages",
    singular: "témoignage",
    description: "Uniquement des avis réels et vérifiables. La section est masquée tant qu’aucun témoignage n’est actif.",
    table: schema.testimonials,
    tag: TAGS.testimonials,
    titleField: "author",
    defaultStatus: "inactive",
    publicPath: "",
    fields: [
      { name: "author", label: "Auteur (tel qu’autorisé par le client)", type: "text", required: true, max: 80 },
      { name: "origin", label: "Provenance", type: "text", max: 80 },
      { name: "quote", label: "Citation", type: "localized", required: true, multiline: true, max: 800 },
      { name: "source", label: "Source (ex. livre d’or, e-mail)", type: "text", max: 80 },
      { name: "stayDate", label: "Date du séjour", type: "date" },
    ],
  },
};

export function getCollection(kind: string): CollectionConfig | null {
  return Object.hasOwn(collections, kind) ? collections[kind] : null;
}

function parse(config: CollectionConfig, form: FormData) {
  const values: Record<string, unknown> = {};
  for (const f of config.fields) {
    switch (f.type) {
      case "text": {
        const v = String(form.get(f.name) ?? "").trim().slice(0, f.max ?? 500);
        if (f.required && !v) throw new ContentError(`« ${f.label} » est obligatoire.`);
        values[f.name] = v || null;
        break;
      }
      case "localized": {
        const v = readLocalized(form, f.name, f.max ?? 5000);
        if (f.required && !v.fr) throw new ContentError(`« ${f.label} » est obligatoire (au moins en français).`);
        values[f.name] = v;
        break;
      }
      case "select": {
        const v = String(form.get(f.name) ?? "");
        if (!f.options.some((o) => o.value === v)) throw new ContentError(`« ${f.label} » invalide.`);
        values[f.name] = v;
        break;
      }
      case "int":
        values[f.name] = readInt(form, f.name, f.min, f.max);
        break;
      case "url": {
        const raw = String(form.get(f.name) ?? "").trim();
        const v = readUrl(form, f.name);
        if (raw && !v) throw new ContentError(`« ${f.label} » n’est pas une URL valide (http/https).`);
        values[f.name] = v;
        break;
      }
      case "date": {
        const v = String(form.get(f.name) ?? "");
        values[f.name] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
        break;
      }
      case "media":
        values[f.name] = readUuid(form, f.name);
        break;
    }
  }
  const status = String(form.get("status") ?? "");
  if (["active", "inactive", "archived"].includes(status)) values.status = status;
  return values;
}

type Row = Record<string, unknown> & { id: string; status: string; sortOrder: number };

export async function listCollection(config: CollectionConfig): Promise<Row[]> {
  return (await db().select().from(config.table).orderBy(asc(config.table.sortOrder))) as unknown as Row[];
}

export async function saveCollectionItem(actorId: string, config: CollectionConfig, form: FormData, id: string | null) {
  const values = parse(config, form);
  const table = config.table;
  if (id) {
    const [row] = await db().update(table).set(values as never).where(eq(table.id, id)).returning({ id: table.id });
    if (!row) throw new ContentError("Élément introuvable.");
    await audit({ actorId, action: `${config.kind}.updated`, entityType: config.kind, entityId: id });
    return row.id;
  }
  if (config.slugFrom) {
    const src = values[config.slugFrom];
    let slug = slugify(typeof src === "string" ? src : isEmptyLocalized(src as never) ? "" : ((src as { fr?: string }).fr ?? ""));
    if (!slug) slug = `item-${Date.now()}`;
    // Ensure uniqueness.
    const slugCol = (table as typeof schema.restaurants).slug;
    for (let i = 2; ; i++) {
      const [hit] = await db().select({ id: table.id }).from(table).where(eq(slugCol, slug));
      if (!hit) break;
      slug = `${slug.replace(/-\d+$/, "")}-${i}`;
    }
    values.slug = slug;
  }
  values.status ??= config.defaultStatus ?? "active";
  const [{ max }] = await db().select({ max: sql<number>`coalesce(max(${table.sortOrder}), 0)` }).from(table);
  values.sortOrder = max + 10;
  const [row] = await db().insert(table).values(values as never).returning({ id: table.id });
  await audit({ actorId, action: `${config.kind}.created`, entityType: config.kind, entityId: row.id });
  return row.id;
}

export async function setCollectionStatus(actorId: string, config: CollectionConfig, id: string, status: "active" | "inactive") {
  await db().update(config.table).set({ status } as never).where(eq(config.table.id, id));
  await audit({ actorId, action: `${config.kind}.${status}`, entityType: config.kind, entityId: id });
}

export async function deleteCollectionItem(actorId: string, config: CollectionConfig, id: string) {
  await db().delete(config.table).where(eq(config.table.id, id));
  await audit({ actorId, action: `${config.kind}.deleted`, entityType: config.kind, entityId: id });
}
