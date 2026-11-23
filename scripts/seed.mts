/**
 * Seed D1 + R2 with the verified hotel content and the photos from picture/.
 *
 *   npm run db:seed            → local (Miniflare)
 *   npm run db:seed -- --remote → your Cloudflare account
 *
 * How: the seed runs against an in-memory SQLite built from the same
 * migrations, then the rows are exported as INSERT statements (applied with
 * `wrangler d1 execute`) and the processed photos are uploaded with
 * `wrangler r2 object put`. Refuses to run on an already-seeded database, so
 * admin edits are never overwritten.
 */
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { BUCKET, DB_NAME, d1Query, lit, memoryDb, target, wrangler } from "./lib";
import { setTestDb, schema } from "../src/server/db";
import { MemoryStorage, setTestStorage } from "../src/server/media/storage";
import { ingestImage } from "../src/server/media/service";
import { defaultRoles } from "../src/server/auth/permissions";
import { defaultWhatsAppTemplates } from "../src/lib/whatsapp";
import * as data from "./seed-data";

const tgt = target();
const existing = d1Query<{ n: number }>("SELECT count(*) AS n FROM suites");
if ((existing[0]?.n ?? 0) > 0 && !process.argv.includes("--force-empty-check")) {
  console.log(`[seed] ${DB_NAME} (${tgt}) already contains content — nothing to do.`);
  process.exit(0);
}

const { db: mem, client } = await memoryDb();
const store = new MemoryStorage();
setTestDb(mem);
setTestStorage(store);
const d = mem;

for (const r of defaultRoles) await d.insert(schema.roles).values(r).onConflictDoNothing();

// Photos: resize (≤ 3200 px), auto-orient, strip metadata, JPEG — then register.
const mediaIds = new Map<string, string>();
for (const img of data.images) {
  const src = await readFile(path.resolve("picture", img.file));
  const jpeg = await sharp(src).rotate().resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const blur = await sharp(jpeg).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  const row = await ingestImage({ data: new Uint8Array(jpeg), originalName: `seed:${img.key}`, category: img.category, alt: img.alt });
  await d.update(schema.mediaAssets).set({ blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}` }).where(eq(schema.mediaAssets.id, row.id));
  mediaIds.set(img.key, row.id);
}
const mid = (k: string | null) => (k ? (mediaIds.get(k) ?? null) : null);

for (const [i, s] of data.suites.entries()) {
  const [row] = await d
    .insert(schema.suites)
    .values({
      slug: s.slug,
      name: s.name,
      collection: s.collection,
      inventoryCategory: s.inventoryCategory,
      tagline: s.tagline,
      description: s.description,
      areaSqm: s.areaSqm,
      maxOccupancy: s.maxOccupancy,
      bedConfiguration: s.bedConfiguration,
      view: s.view,
      viewDetails: s.viewDetails,
      features: s.features,
      amenities: s.amenities,
      mainImageId: mid(s.mainImage),
      sortOrder: i * 10,
      internalNotes: s.internalNotes,
      seoDescription: s.tagline,
    })
    .returning({ id: schema.suites.id });
  const gallery = [s.mainImage, ...s.gallery].filter(Boolean) as string[];
  for (const [j, k] of gallery.entries()) await d.insert(schema.suiteImages).values({ suiteId: row.id, mediaId: mid(k)!, sortOrder: j });
}

for (const [i, r] of data.restaurants.entries()) await d.insert(schema.restaurants).values({ ...r, sortOrder: i * 10 });
for (const [i, f] of data.spaFacilities.entries())
  await d.insert(schema.spaServices).values({ kind: "facility", title: f.title, description: f.description, sortOrder: i * 10, imageId: i === 0 ? mid("spa-hand-ritual") : null });
for (const [i, e] of data.experiencesSeed.entries()) await d.insert(schema.experiences).values({ ...e, sortOrder: i * 10 });
for (const [i, e] of data.eventsSeed.entries()) await d.insert(schema.eventOfferings).values({ ...e, sortOrder: i * 10, imageId: i === 0 ? mid("courtyard-pool-night") : null });

const galleryOrder = ["courtyard-pool-night", "bedroom-arch-sea", "infinity-pool-portico", "terrace-whirlpool", "suite-living-screen", "spa-hand-ritual", "bedroom-carved-table", "welcome-berries", "bathroom-zellige", "vanity-star-screen", "suite-lounge-dining"];
for (const [i, k] of galleryOrder.entries()) {
  const img = data.images.find((x) => x.key === k)!;
  await d.insert(schema.galleryImages).values({ mediaId: mid(k)!, category: img.category, caption: img.alt, sortOrder: i * 10 });
}

const heroes: Record<string, string> = {
  home: "bedroom-arch-sea", concept: "courtyard-pool-night", suites: "terrace-whirlpool", dining: "welcome-berries", spa: "spa-hand-ritual",
  experiences: "infinity-pool-portico", events: "courtyard-pool-night", gallery: "suite-living-screen", contact: "infinity-pool-portico", reservations: "bedroom-carved-table",
};
const homeSections = {
  intro: { visible: true, imageId: mid("suite-living-screen") }, suites: { visible: true }, dining: { visible: true, imageId: mid("welcome-berries") },
  spa: { visible: true, imageId: mid("spa-hand-ritual") }, pools: { visible: true, imageId: mid("terrace-whirlpool") }, poolsInset: { visible: true, imageId: mid("infinity-pool-portico") },
  experiences: { visible: true }, events: { visible: true, imageId: mid("courtyard-pool-night") }, gallery: { visible: true }, testimonials: { visible: true }, contact: { visible: true },
};
for (const [key, hero] of Object.entries(heroes))
  await d.insert(schema.pages).values({ key, heroImageId: mid(hero), ogImageId: mid(hero), sections: key === "home" ? homeSections : {} });

await d.insert(schema.settings).values({ key: "contact", value: data.contactSettings });
await d.insert(schema.settings).values({ key: "whatsapp.templates", value: defaultWhatsAppTemplates });

// Export rows as SQL (FK-safe order) and the photos as files.
const tables = ["roles", "media_assets", "suites", "suite_images", "restaurants", "spa_services", "experiences", "event_offerings", "gallery_images", "pages", "settings"];
const lines: string[] = [];
for (const t of tables) {
  const res = await client.execute(`SELECT * FROM "${t}"`);
  for (const r of res.rows) {
    const cols = res.columns;
    lines.push(`INSERT OR IGNORE INTO "${t}" (${cols.map((c: string) => `"${c}"`).join(", ")}) VALUES (${cols.map((c: string) => lit(r[c])).join(", ")});`);
  }
}
const outDir = path.resolve(".data/seed");
await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, "media"), { recursive: true });
await writeFile(path.join(outDir, "seed.sql"), lines.join("\n") + "\n");
console.log(`[seed] ${lines.length} rows prepared, ${store.files.size} photos`);

for (const [key, f] of store.files) {
  const file = path.join(outDir, "media", key.replace(/\//g, "_"));
  await writeFile(file, f.data);
  wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", f.contentType, "--cache-control", "public, max-age=31536000, immutable", tgt]);
}
wrangler(["d1", "execute", DB_NAME, tgt, "--file", path.join(outDir, "seed.sql")]);
console.log(`[seed] done (${tgt}).`);
process.exit(0);
