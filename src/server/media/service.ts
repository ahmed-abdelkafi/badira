import "server-only";
import { imageSize } from "image-size";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { batch, db, schema } from "@/server/db";
import type { Localized } from "@/lib/localized";
import { storage } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 3200;
const ALLOWED: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

export class MediaError extends Error {}

type Processed = { data: Uint8Array; mime: string; ext: string; width: number; height: number; blur: string | null };

/** Identify the image from its bytes (never trust the file name or MIME type). */
function inspect(data: Uint8Array): { ext: string; mime: string; width: number; height: number } {
  let info;
  try {
    info = imageSize(data);
  } catch {
    throw new MediaError("Le fichier n’est pas une image valide.");
  }
  const ext = info.type === "jpeg" ? "jpg" : (info.type ?? "");
  if (!ALLOWED[ext] || !info.width || !info.height) throw new MediaError("Format non pris en charge (JPEG, PNG, WebP ou AVIF).");
  const rotated = info.orientation && info.orientation >= 5;
  return { ext, mime: ALLOWED[ext], width: rotated ? info.height : info.width, height: rotated ? info.width : info.height };
}

const toStream = (data: Uint8Array) => new Blob([data.slice()]).stream();
async function readAll(stream: ReadableStream<Uint8Array>) {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Normalise with the Cloudflare Images binding: cap the longest edge,
 * re-encode as JPEG (drops camera metadata) and build a tiny blur preview.
 * Falls back to storing the validated original when the binding is
 * unavailable (e.g. some local setups).
 */
async function processImage(data: Uint8Array): Promise<Processed> {
  const original = inspect(data);
  let images: ImagesBinding | undefined;
  try {
    images = getCloudflareContext().env.IMAGES;
  } catch {
    images = undefined;
  }
  if (images) {
    try {
      const out = await images
        .input(toStream(data))
        .transform({ width: MAX_EDGE, height: MAX_EDGE, fit: "scale-down" })
        .output({ format: "image/jpeg", quality: 88 });
      const normalised = await readAll(out.image());
      const dims = inspect(normalised);
      let blur: string | null = null;
      try {
        const tiny = await images.input(toStream(normalised)).transform({ width: 16, height: 16, fit: "scale-down" }).output({ format: "image/webp", quality: 40 });
        blur = `data:image/webp;base64,${await new Response(tiny.image({ encoding: "base64" })).text()}`;
      } catch {
        blur = null;
      }
      return { data: normalised, mime: "image/jpeg", ext: "jpg", width: dims.width, height: dims.height, blur };
    } catch (err) {
      console.error("[media] Images binding failed, storing original:", (err as Error).message);
    }
  }
  return { data, mime: original.mime, ext: original.ext, width: original.width, height: original.height, blur: null };
}

function randomKey(ext: string) {
  const now = new Date();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${rand}.${ext}`;
}

export async function ingestImage(input: {
  data: Uint8Array;
  originalName: string;
  category?: string;
  alt?: Localized;
  uploadedBy?: string | null;
}) {
  if (input.data.byteLength === 0) throw new MediaError("Fichier vide.");
  if (input.data.byteLength > MAX_UPLOAD_BYTES) throw new MediaError("Fichier supérieur à 15 Mo.");
  const p = await processImage(input.data);
  const key = randomKey(p.ext);
  await storage().put(key, p.data, p.mime);
  const [row] = await db()
    .insert(schema.mediaAssets)
    .values({
      storageKey: key,
      originalName: input.originalName.slice(0, 200),
      mimeType: p.mime,
      width: p.width,
      height: p.height,
      bytes: p.data.byteLength,
      alt: input.alt ?? {},
      blurDataUrl: p.blur,
      category: input.category ?? "general",
      uploadedBy: input.uploadedBy ?? null,
    })
    .returning();
  return row;
}

/** Replace the file behind an existing asset — every reference updates at once. */
export async function replaceImage(id: string, data: Uint8Array, originalName: string) {
  const [existing] = await db().select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  if (!existing) throw new MediaError("Image introuvable.");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new MediaError("Fichier supérieur à 15 Mo.");
  const p = await processImage(data);
  const key = randomKey(p.ext);
  await storage().put(key, p.data, p.mime);
  await batch([
    db()
      .update(schema.mediaAssets)
      .set({ storageKey: key, originalName: originalName.slice(0, 200), mimeType: p.mime, width: p.width, height: p.height, bytes: p.data.byteLength, blurDataUrl: p.blur })
      .where(eq(schema.mediaAssets.id, id)),
  ]);
  await storage().remove(existing.storageKey);
}

export async function deleteMedia(id: string) {
  const [existing] = await db().delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id)).returning();
  if (existing) await storage().remove(existing.storageKey);
}

export function mediaUrl(storageKey: string): string {
  return `/media/${storageKey}`;
}
