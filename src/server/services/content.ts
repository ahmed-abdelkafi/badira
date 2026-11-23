import "server-only";
import { and, asc, eq, gt, lt, desc, inArray, sql } from "drizzle-orm";
import { batch, db, schema } from "@/server/db";
import { audit } from "@/server/audit";
import type { Localized } from "@/lib/localized";
import { locales } from "@/i18n/config";

/* ------------------------------------------------------------------ */
/* Form helpers (localized fields: name.fr / name.en / name.ar)        */
/* ------------------------------------------------------------------ */

const clean = (v: FormDataEntryValue | null, max = 20000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function readLocalized(form: FormData, name: string, max = 20000): Localized {
  const out: Localized = {};
  for (const l of locales) {
    const v = clean(form.get(`${name}.${l}`), max);
    if (v) out[l] = v;
  }
  return out;
}

/** One item per line, aligned across locales by line index. */
export function readLocalizedList(form: FormData, name: string): Localized[] {
  const lines = Object.fromEntries(locales.map((l) => [l, clean(form.get(`${name}.${l}`)).split(/\r?\n/).map((s) => s.trim())]));
  const n = Math.max(...locales.map((l) => lines[l].length));
  const out: Localized[] = [];
  for (let i = 0; i < n; i++) {
    const item: Localized = {};
    for (const l of locales) if (lines[l][i]) item[l] = lines[l][i].slice(0, 300);
    if (Object.keys(item).length) out.push(item);
  }
  return out.slice(0, 50);
}

export function readInt(form: FormData, name: string, min: number, max: number): number | null {
  const v = clean(form.get(name));
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function readUuid(form: FormData, name: string): string | null {
  const v = clean(form.get(name));
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

export function readUrl(form: FormData, name: string): string | null {
  const v = clean(form.get(name), 2000);
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export class ContentError extends Error {}

/* ------------------------------------------------------------------ */
/* Suites                                                              */
/* ------------------------------------------------------------------ */

export type SuiteInput = {
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
  view: "garden" | "partial_sea" | "sea" | "pool_and_sea" | null;
  viewDetails: Localized;
  amenities: Localized[];
  features: Localized[];
  seoTitle: Localized;
  seoDescription: Localized;
  internalNotes: string | null;
};

export function parseSuiteForm(form: FormData): SuiteInput {
  const name = clean(form.get("name"), 120);
  if (!name) throw new ContentError("Le nom est obligatoire.");
  const slug = slugify(clean(form.get("slug")) || name);
  if (!slug) throw new ContentError("Identifiant d’URL invalide.");
  const collection = clean(form.get("collection"));
  const inventory = clean(form.get("inventoryCategory"));
  const status = clean(form.get("status"));
  const view = clean(form.get("view"));
  if (!["standard", "legend"].includes(collection)) throw new ContentError("Collection invalide.");
  if (!["fell", "yasmine", "nour", "legend"].includes(inventory)) throw new ContentError("Catégorie d’inventaire invalide.");
  if (!["active", "inactive", "archived"].includes(status)) throw new ContentError("Statut invalide.");
  return {
    slug,
    name,
    collection: collection as SuiteInput["collection"],
    inventoryCategory: inventory as SuiteInput["inventoryCategory"],
    status: status as SuiteInput["status"],
    tagline: readLocalized(form, "tagline", 300),
    description: readLocalized(form, "description", 5000),
    areaSqm: readInt(form, "areaSqm", 1, 5000),
    maxOccupancy: readInt(form, "maxOccupancy", 1, 50),
    bedConfiguration: readLocalized(form, "bedConfiguration", 200),
    view: ["garden", "partial_sea", "sea", "pool_and_sea"].includes(view) ? (view as SuiteInput["view"]) : null,
    viewDetails: readLocalized(form, "viewDetails", 300),
    amenities: readLocalizedList(form, "amenities"),
    features: readLocalizedList(form, "features"),
    seoTitle: readLocalized(form, "seoTitle", 120),
    seoDescription: readLocalized(form, "seoDescription", 320),
    internalNotes: clean(form.get("internalNotes"), 4000) || null,
  };
}

export async function listSuitesAdmin() {
  const rows = await db()
    .select({ s: schema.suites, img: schema.mediaAssets.storageKey, imageCount: sql<number>`(select count(*) from suite_images si where si.suite_id = ${schema.suites.id})` })
    .from(schema.suites)
    .leftJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.suites.mainImageId))
    .orderBy(asc(schema.suites.sortOrder), asc(schema.suites.name));
  return rows;
}

export async function getSuiteAdmin(id: string) {
  const [s] = await db().select().from(schema.suites).where(eq(schema.suites.id, id));
  if (!s) return null;
  const images = await db()
    .select({ mediaId: schema.suiteImages.mediaId, sortOrder: schema.suiteImages.sortOrder, m: schema.mediaAssets })
    .from(schema.suiteImages)
    .innerJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.suiteImages.mediaId))
    .where(eq(schema.suiteImages.suiteId, id))
    .orderBy(asc(schema.suiteImages.sortOrder));
  return { ...s, images };
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const [hit] = await db().select({ id: schema.suites.id }).from(schema.suites).where(eq(schema.suites.slug, slug));
  if (hit && hit.id !== exceptId) throw new ContentError("Cet identifiant d’URL est déjà utilisé par une autre suite.");
}

export async function createSuite(actorId: string, input: SuiteInput) {
  await assertSlugFree(input.slug);
  const [{ max }] = await db().select({ max: sql<number>`coalesce(max(${schema.suites.sortOrder}), 0)` }).from(schema.suites);
  const [row] = await db().insert(schema.suites).values({ ...input, sortOrder: max + 10 }).returning();
  await audit({ actorId, action: "suite.created", entityType: "suite", entityId: row.id, meta: { slug: row.slug } });
  return row;
}

export async function updateSuite(actorId: string, id: string, input: SuiteInput) {
  await assertSlugFree(input.slug, id);
  const [before] = await db().select({ slug: schema.suites.slug }).from(schema.suites).where(eq(schema.suites.id, id));
  if (!before) throw new ContentError("Suite introuvable.");
  const [row] = await db().update(schema.suites).set(input).where(eq(schema.suites.id, id)).returning();
  await audit({ actorId, action: "suite.updated", entityType: "suite", entityId: id, meta: { slug: row.slug } });
  return { row, previousSlug: before.slug };
}

export async function setSuiteStatus(actorId: string, id: string, status: "active" | "inactive" | "archived") {
  const [row] = await db().update(schema.suites).set({ status }).where(eq(schema.suites.id, id)).returning({ slug: schema.suites.slug });
  if (!row) throw new ContentError("Suite introuvable.");
  await audit({ actorId, action: `suite.${status}`, entityType: "suite", entityId: id, meta: { slug: row.slug } });
  return row;
}

/** Hard delete is only allowed for archived suites without reservations pointing at them. */
export async function deleteSuite(actorId: string, id: string) {
  const [s] = await db().select().from(schema.suites).where(eq(schema.suites.id, id));
  if (!s) throw new ContentError("Suite introuvable.");
  if (s.status !== "archived") throw new ContentError("Archivez la suite avant de la supprimer définitivement.");
  const [{ n }] = await db().select({ n: sql<number>`count(*)` }).from(schema.reservations).where(eq(schema.reservations.preferredSuiteId, id));
  if (n > 0) throw new ContentError(`Impossible : ${n} demande(s) de réservation font référence à cette suite. Laissez-la archivée.`);
  await db().delete(schema.suites).where(eq(schema.suites.id, id));
  await audit({ actorId, action: "suite.deleted", entityType: "suite", entityId: id, meta: { slug: s.slug } });
  return s;
}

/* ------------------------------------------------------------------ */
/* Generic ordering                                                    */
/* ------------------------------------------------------------------ */

type OrderedTable =
  | typeof schema.suites
  | typeof schema.restaurants
  | typeof schema.spaServices
  | typeof schema.experiences
  | typeof schema.eventOfferings
  | typeof schema.testimonials
  | typeof schema.galleryImages;

/** Swap sortOrder with the previous/next row. */
export async function moveRow(table: OrderedTable, id: string, direction: "up" | "down") {
  {
    const [row] = await db().select({ id: table.id, sortOrder: table.sortOrder }).from(table).where(eq(table.id, id));
    if (!row) return;
    const [neighbor] = await db()
      .select({ id: table.id, sortOrder: table.sortOrder })
      .from(table)
      .where(direction === "up" ? lt(table.sortOrder, row.sortOrder) : gt(table.sortOrder, row.sortOrder))
      .orderBy(direction === "up" ? desc(table.sortOrder) : asc(table.sortOrder))
      .limit(1);
    if (!neighbor) return;
    await batch([
      db().update(table).set({ sortOrder: neighbor.sortOrder }).where(eq(table.id, row.id)),
      db().update(table).set({ sortOrder: row.sortOrder }).where(eq(table.id, neighbor.id)),
    ]);
  }
}

/* ------------------------------------------------------------------ */
/* Suite images                                                        */
/* ------------------------------------------------------------------ */

export async function addSuiteImages(actorId: string, suiteId: string, mediaIds: string[]) {
  if (!mediaIds.length) return;
  const [{ max }] = await db()
    .select({ max: sql<number>`coalesce(max(${schema.suiteImages.sortOrder}), -1)` })
    .from(schema.suiteImages)
    .where(eq(schema.suiteImages.suiteId, suiteId));
  await db()
    .insert(schema.suiteImages)
    .values(mediaIds.map((mediaId, i) => ({ suiteId, mediaId, sortOrder: max + 1 + i })))
    .onConflictDoNothing();
  const [s] = await db().select({ main: schema.suites.mainImageId }).from(schema.suites).where(eq(schema.suites.id, suiteId));
  if (s && !s.main) await db().update(schema.suites).set({ mainImageId: mediaIds[0] }).where(eq(schema.suites.id, suiteId));
  await audit({ actorId, action: "suite.images_added", entityType: "suite", entityId: suiteId, meta: { count: mediaIds.length } });
}

export async function removeSuiteImage(actorId: string, suiteId: string, mediaId: string) {
  await db().delete(schema.suiteImages).where(and(eq(schema.suiteImages.suiteId, suiteId), eq(schema.suiteImages.mediaId, mediaId)));
  const [s] = await db().select({ main: schema.suites.mainImageId }).from(schema.suites).where(eq(schema.suites.id, suiteId));
  if (s?.main === mediaId) {
    const [next] = await db().select({ mediaId: schema.suiteImages.mediaId }).from(schema.suiteImages).where(eq(schema.suiteImages.suiteId, suiteId)).orderBy(asc(schema.suiteImages.sortOrder)).limit(1);
    await db().update(schema.suites).set({ mainImageId: next?.mediaId ?? null }).where(eq(schema.suites.id, suiteId));
  }
  await audit({ actorId, action: "suite.image_removed", entityType: "suite", entityId: suiteId });
}

export async function setSuiteMainImage(actorId: string, suiteId: string, mediaId: string) {
  const [link] = await db().select().from(schema.suiteImages).where(and(eq(schema.suiteImages.suiteId, suiteId), eq(schema.suiteImages.mediaId, mediaId)));
  if (!link) throw new ContentError("Cette image n’appartient pas à la suite.");
  await db().update(schema.suites).set({ mainImageId: mediaId }).where(eq(schema.suites.id, suiteId));
  await audit({ actorId, action: "suite.main_image_changed", entityType: "suite", entityId: suiteId });
}

export async function moveSuiteImage(suiteId: string, mediaId: string, direction: "up" | "down") {
  const rows = await db().select().from(schema.suiteImages).where(eq(schema.suiteImages.suiteId, suiteId)).orderBy(asc(schema.suiteImages.sortOrder));
  const i = rows.findIndex((r) => r.mediaId === mediaId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await batch(
    rows.map((r, k) => db().update(schema.suiteImages).set({ sortOrder: k }).where(and(eq(schema.suiteImages.suiteId, suiteId), eq(schema.suiteImages.mediaId, r.mediaId)))),
  );
}

/* ------------------------------------------------------------------ */
/* Media usage (to prevent deleting images still in use)              */
/* ------------------------------------------------------------------ */

export async function mediaUsage(mediaIds: string[]): Promise<Map<string, string[]>> {
  const usage = new Map<string, string[]>();
  if (!mediaIds.length) return usage;
  const add = (id: string | null, where: string) => {
    if (!id) return;
    usage.set(id, [...(usage.get(id) ?? []), where]);
  };
  const [suites, links, gallery, rest, spa, exp, ev, pages] = await Promise.all([
    db().select({ id: schema.suites.mainImageId, name: schema.suites.name }).from(schema.suites).where(inArray(schema.suites.mainImageId, mediaIds)),
    db().select({ id: schema.suiteImages.mediaId, name: schema.suites.name }).from(schema.suiteImages).innerJoin(schema.suites, eq(schema.suites.id, schema.suiteImages.suiteId)).where(inArray(schema.suiteImages.mediaId, mediaIds)),
    db().select({ id: schema.galleryImages.mediaId }).from(schema.galleryImages).where(inArray(schema.galleryImages.mediaId, mediaIds)),
    db().select({ id: schema.restaurants.imageId, name: schema.restaurants.name }).from(schema.restaurants).where(inArray(schema.restaurants.imageId, mediaIds)),
    db().select({ id: schema.spaServices.imageId }).from(schema.spaServices).where(inArray(schema.spaServices.imageId, mediaIds)),
    db().select({ id: schema.experiences.imageId }).from(schema.experiences).where(inArray(schema.experiences.imageId, mediaIds)),
    db().select({ id: schema.eventOfferings.imageId }).from(schema.eventOfferings).where(inArray(schema.eventOfferings.imageId, mediaIds)),
    db().select().from(schema.pages),
  ]);
  suites.forEach((r) => add(r.id, `Suite ${r.name} (principale)`));
  links.forEach((r) => add(r.id, `Suite ${r.name}`));
  gallery.forEach((r) => add(r.id, "Galerie"));
  rest.forEach((r) => add(r.id, `Restaurant ${r.name}`));
  spa.forEach((r) => add(r.id, "Spa"));
  exp.forEach((r) => add(r.id, "Expérience"));
  ev.forEach((r) => add(r.id, "Événement"));
  for (const p of pages) {
    if (p.heroImageId && mediaIds.includes(p.heroImageId)) add(p.heroImageId, `Page ${p.key} (hero)`);
    if (p.ogImageId && mediaIds.includes(p.ogImageId)) add(p.ogImageId, `Page ${p.key} (partage)`);
    for (const [k, s] of Object.entries(p.sections)) if (s.imageId && mediaIds.includes(s.imageId)) add(s.imageId, `Page ${p.key} — ${k}`);
  }
  return usage;
}

export async function listGalleryAdmin() {
  return db()
    .select({ g: schema.galleryImages, m: schema.mediaAssets })
    .from(schema.galleryImages)
    .innerJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.galleryImages.mediaId))
    .orderBy(asc(schema.galleryImages.sortOrder));
}
