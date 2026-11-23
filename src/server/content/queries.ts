import "server-only";
import { cache } from "react";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { Localized } from "@/lib/localized";
import { defaultWhatsAppTemplates, type WhatsAppTemplates } from "@/lib/whatsapp";

/** Content groups (kept for invalidation hooks; pages currently render per request). */
export const TAGS = {
  suites: "suites",
  media: "media",
  restaurants: "restaurants",
  spa: "spa",
  experiences: "experiences",
  events: "events",
  gallery: "gallery",
  testimonials: "testimonials",
  pages: "pages",
  settings: "settings",
  translations: "translations",
} as const;

export type Img = { id: string; src: string; width: number; height: number; blur: string | null; alt: Localized };

type MediaRow = typeof schema.mediaAssets.$inferSelect;
export function toImg(m: MediaRow | null | undefined): Img | null {
  if (!m) return null;
  return { id: m.id, src: `/media/${m.storageKey}`, width: m.width, height: m.height, blur: m.blurDataUrl, alt: m.alt };
}

async function mediaByIds(ids: (string | null | undefined)[]): Promise<Map<string, Img>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const rows = await db().select().from(schema.mediaAssets).where(inArray(schema.mediaAssets.id, unique));
  return new Map(rows.map((r) => [r.id, toImg(r)!]));
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type ContactSettings = {
  address: Localized;
  phone: string;
  whatsapp: string;
  email: string;
  mapsUrl: string;
  social: { facebook?: string; instagram?: string; linkedin?: string; twitter?: string };
  spaBookingUrl?: string;
  spaMenuUrl?: string;
  conciergeBrochureUrl?: string;
  dressCodeUrl?: string;
  leadersClubUrl?: string;
};

const fallbackContact: ContactSettings = {
  address: { fr: "BP437, Hammamet 8050, Tunisie", en: "BP437, Hammamet 8050, Tunisia" },
  phone: "+21670018180",
  whatsapp: "",
  email: "contact@labadira.com",
  mapsUrl: "",
  social: {},
};

async function getContactSettingsImpl(): Promise<ContactSettings> {
  const [row] = await db().select().from(schema.settings).where(eq(schema.settings.key, "contact"));
  return { ...fallbackContact, ...((row?.value as Partial<ContactSettings>) ?? {}) };
}

async function getWhatsAppTemplatesImpl(): Promise<WhatsAppTemplates> {
  const [row] = await db().select().from(schema.settings).where(eq(schema.settings.key, "whatsapp.templates"));
  const stored = (row?.value ?? {}) as Partial<WhatsAppTemplates>;
  return {
    accept: { ...defaultWhatsAppTemplates.accept, ...stored.accept },
    decline: { ...defaultWhatsAppTemplates.decline, ...stored.decline },
    general: { ...defaultWhatsAppTemplates.general, ...stored.general },
  };
}

/* ------------------------------------------------------------------ */
/* Suites                                                              */
/* ------------------------------------------------------------------ */

export type SuiteSummary = {
  id: string;
  slug: string;
  name: string;
  collection: "standard" | "legend";
  inventoryCategory: "fell" | "yasmine" | "nour" | "legend";
  tagline: Localized;
  areaSqm: number | null;
  view: "garden" | "partial_sea" | "sea" | "pool_and_sea" | null;
  image: Img | null;
};

export type SuiteDetail = SuiteSummary & {
  description: Localized;
  maxOccupancy: number | null;
  bedConfiguration: Localized;
  viewDetails: Localized;
  amenities: Localized[];
  features: Localized[];
  gallery: Img[];
  seoTitle: Localized;
  seoDescription: Localized;
  updatedAt: string;
};

async function getActiveSuitesImpl(): Promise<SuiteSummary[]> {
  const rows = await db()
    .select()
    .from(schema.suites)
    .where(eq(schema.suites.status, "active"))
    .orderBy(asc(schema.suites.sortOrder), asc(schema.suites.name));
  const media = await mediaByIds(rows.map((r) => r.mainImageId));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    collection: r.collection,
    inventoryCategory: r.inventoryCategory,
    tagline: r.tagline,
    areaSqm: r.areaSqm,
    view: r.view,
    image: r.mainImageId ? (media.get(r.mainImageId) ?? null) : null,
  }));
}

async function getSuiteBySlugImpl(slug: string): Promise<SuiteDetail | null> {
  const [r] = await db()
    .select()
    .from(schema.suites)
    .where(and(eq(schema.suites.slug, slug), eq(schema.suites.status, "active")));
  if (!r) return null;
  const imgs = await db()
    .select({ m: schema.mediaAssets })
    .from(schema.suiteImages)
    .innerJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.suiteImages.mediaId))
    .where(eq(schema.suiteImages.suiteId, r.id))
    .orderBy(asc(schema.suiteImages.sortOrder));
  const gallery = imgs.map((x) => toImg(x.m)!);
  const main = r.mainImageId ? (gallery.find((g) => g.id === r.mainImageId) ?? (await mediaByIds([r.mainImageId])).get(r.mainImageId) ?? null) : null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    collection: r.collection,
    inventoryCategory: r.inventoryCategory,
    tagline: r.tagline,
    areaSqm: r.areaSqm,
    view: r.view,
    image: main,
    description: r.description,
    maxOccupancy: r.maxOccupancy,
    bedConfiguration: r.bedConfiguration,
    viewDetails: r.viewDetails,
    amenities: r.amenities,
    features: r.features,
    gallery,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function getActiveSuiteSlugsImpl(): Promise<string[]> {
  const rows = await db().select({ slug: schema.suites.slug }).from(schema.suites).where(eq(schema.suites.status, "active"));
  return rows.map((r) => r.slug);
}

/* ------------------------------------------------------------------ */
/* Other content                                                       */
/* ------------------------------------------------------------------ */

async function getRestaurantsImpl() {
  const rows = await db().select().from(schema.restaurants).where(eq(schema.restaurants.status, "active")).orderBy(asc(schema.restaurants.sortOrder));
  const media = await mediaByIds(rows.map((r) => r.imageId));
  return rows.map((r) => ({ ...r, image: r.imageId ? (media.get(r.imageId) ?? null) : null, createdAt: undefined, updatedAt: undefined }));
}

async function getSpaServicesImpl() {
  const rows = await db().select().from(schema.spaServices).where(eq(schema.spaServices.status, "active")).orderBy(asc(schema.spaServices.sortOrder));
  const media = await mediaByIds(rows.map((r) => r.imageId));
  return rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, description: r.description, durationMinutes: r.durationMinutes, image: r.imageId ? (media.get(r.imageId) ?? null) : null }));
}

async function getExperiencesImpl() {
  const rows = await db().select().from(schema.experiences).where(eq(schema.experiences.status, "active")).orderBy(asc(schema.experiences.sortOrder));
  const media = await mediaByIds(rows.map((r) => r.imageId));
  return rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, description: r.description, image: r.imageId ? (media.get(r.imageId) ?? null) : null }));
}

async function getEventOfferingsImpl() {
  const rows = await db().select().from(schema.eventOfferings).where(eq(schema.eventOfferings.status, "active")).orderBy(asc(schema.eventOfferings.sortOrder));
  const media = await mediaByIds(rows.map((r) => r.imageId));
  return rows.map((r) => ({ id: r.id, slug: r.slug, kind: r.kind, title: r.title, description: r.description, brochureUrl: r.brochureUrl, image: r.imageId ? (media.get(r.imageId) ?? null) : null }));
}

async function getGalleryImpl() {
  const rows = await db()
    .select({ g: schema.galleryImages, m: schema.mediaAssets })
    .from(schema.galleryImages)
    .innerJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.galleryImages.mediaId))
    .where(eq(schema.galleryImages.status, "active"))
    .orderBy(asc(schema.galleryImages.sortOrder));
  return rows.map(({ g, m }) => ({ id: g.id, category: g.category, caption: g.caption, image: toImg(m)! }));
}

async function getPublishedTestimonialsImpl() {
  const rows = await db().select().from(schema.testimonials).where(eq(schema.testimonials.status, "active")).orderBy(asc(schema.testimonials.sortOrder));
  return rows.map((r) => ({ id: r.id, author: r.author, origin: r.origin, quote: r.quote, source: r.source, stayDate: r.stayDate }));
}

export type PageContent = {
  key: string;
  seoTitle: Localized;
  seoDescription: Localized;
  hero: Img | null;
  og: Img | null;
  sections: Record<string, { visible?: boolean; eyebrow?: Localized; title?: Localized; body?: Localized; image?: Img | null }>;
};

async function getPageImpl(key: string): Promise<PageContent> {
  const [p] = await db().select().from(schema.pages).where(eq(schema.pages.key, key));
  if (!p) return { key, seoTitle: {}, seoDescription: {}, hero: null, og: null, sections: {} };
  const sectionImageIds = Object.values(p.sections).map((s) => s.imageId);
  const media = await mediaByIds([p.heroImageId, p.ogImageId, ...sectionImageIds]);
  const sections: PageContent["sections"] = {};
  for (const [k, s] of Object.entries(p.sections)) {
    sections[k] = { visible: s.visible, eyebrow: s.eyebrow, title: s.title, body: s.body, image: s.imageId ? (media.get(s.imageId) ?? null) : null };
  }
  return {
    key,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    hero: p.heroImageId ? (media.get(p.heroImageId) ?? null) : null,
    og: p.ogImageId ? (media.get(p.ogImageId) ?? null) : null,
    sections,
  };
}

async function getMediaByCategoryImpl(category: string, limit = 12): Promise<Img[]> {
  const rows = await db().select().from(schema.mediaAssets).where(and(eq(schema.mediaAssets.category, category), ne(schema.mediaAssets.width, 0))).limit(limit);
  return rows.map((r) => toImg(r)!);
}

async function getTranslationOverridesImpl(locale: string): Promise<Record<string, string>> {
  const rows = await db().select().from(schema.translations).where(eq(schema.translations.locale, locale));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export const getContactSettings = cache(getContactSettingsImpl);
export const getWhatsAppTemplates = cache(getWhatsAppTemplatesImpl);
export const getActiveSuites = cache(getActiveSuitesImpl);
export const getSuiteBySlug = cache(getSuiteBySlugImpl);
export const getActiveSuiteSlugs = cache(getActiveSuiteSlugsImpl);
export const getRestaurants = cache(getRestaurantsImpl);
export const getSpaServices = cache(getSpaServicesImpl);
export const getExperiences = cache(getExperiencesImpl);
export const getEventOfferings = cache(getEventOfferingsImpl);
export const getGallery = cache(getGalleryImpl);
export const getPublishedTestimonials = cache(getPublishedTestimonialsImpl);
export const getPage = cache(getPageImpl);
export const getMediaByCategory = cache(getMediaByCategoryImpl);
export const getTranslationOverrides = cache(getTranslationOverridesImpl);
