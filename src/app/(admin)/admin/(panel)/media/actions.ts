"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/dal";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { deleteMedia, ingestImage, MediaError, replaceImage } from "@/server/media/service";
import { mediaUsage, moveRow, readLocalized } from "@/server/services/content";
import { invalidate, TAGS, type ActionState } from "@/server/services/admin-helpers";

const uuid = z.uuid();
const categories = ["general", "architecture", "suites", "dining", "spa", "pools", "beach", "events", "experiences"] as const;

export async function uploadMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("media.manage");
  const category = z.enum(categories).catch("general").parse(form.get("category"));
  const addToGallery = form.get("gallery") === "on";
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Sélectionnez au moins une image." };
  if (files.length > 20) return { error: "20 fichiers maximum par envoi." };
  let ok = 0;
  const errors: string[] = [];
  for (const f of files) {
    try {
      const m = await ingestImage({ data: new Uint8Array(await f.arrayBuffer()), originalName: f.name, category, uploadedBy: user.id });
      if (addToGallery) {
        const [{ max }] = await db().select({ max: sql<number>`coalesce(max(${schema.galleryImages.sortOrder}),0)` }).from(schema.galleryImages);
        await db().insert(schema.galleryImages).values({ mediaId: m.id, category, sortOrder: max + 10 });
      }
      ok++;
    } catch (err) {
      if (err instanceof MediaError) errors.push(`${f.name} : ${err.message}`);
      else throw err;
    }
  }
  await audit({ actorId: user.id, action: "media.uploaded", meta: { count: ok, category } });
  invalidate(TAGS.media, TAGS.gallery);
  revalidatePath("/admin/media");
  revalidatePath("/admin/gallery");
  return errors.length ? { ok: ok > 0, error: errors.join(" · "), message: `${ok} image(s) importée(s).` } : { ok: true, message: `${ok} image(s) importée(s). Pensez à renseigner le texte alternatif.` };
}

export async function updateMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("media.manage");
  const id = uuid.parse(form.get("id"));
  const alt = readLocalized(form, "alt", 300);
  const category = z.enum(categories).catch("general").parse(form.get("category"));
  await db().update(schema.mediaAssets).set({ alt, category }).where(eq(schema.mediaAssets.id, id));
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      await replaceImage(id, new Uint8Array(await file.arrayBuffer()), file.name);
    } catch (err) {
      if (err instanceof MediaError) return { error: err.message };
      throw err;
    }
  }
  await audit({ actorId: user.id, action: "media.updated", entityType: "media", entityId: id, meta: { replaced: file instanceof File && file.size > 0 } });
  invalidate(TAGS.media, TAGS.gallery, TAGS.suites, TAGS.pages);
  revalidatePath("/admin/media");
  return { ok: true, message: "Image mise à jour partout où elle est utilisée." };
}

export async function deleteMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("media.manage");
  const id = uuid.parse(form.get("id"));
  const usage = (await mediaUsage([id])).get(id) ?? [];
  // Gallery entries are removed along with the image; anything else blocks deletion.
  const blocking = usage.filter((u) => u !== "Galerie");
  if (blocking.length) return { error: `Image utilisée : ${blocking.join(", ")}. Remplacez-la d’abord.` };
  await deleteMedia(id);
  await audit({ actorId: user.id, action: "media.deleted", entityType: "media", entityId: id });
  invalidate(TAGS.media, TAGS.gallery);
  revalidatePath("/admin/media");
  return { ok: true, message: "Image supprimée." };
}

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

export async function galleryAction(form: FormData) {
  const user = await requireAdmin("content.manage");
  const op = z.enum(["up", "down", "show", "hide", "remove", "add"]).parse(form.get("op"));
  if (op === "add") {
    const mediaId = uuid.parse(form.get("mediaId"));
    const [m] = await db().select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, mediaId));
    if (m) {
      const [{ max }] = await db().select({ max: sql<number>`coalesce(max(${schema.galleryImages.sortOrder}),0)` }).from(schema.galleryImages);
      await db().insert(schema.galleryImages).values({ mediaId, category: m.category, caption: m.alt, sortOrder: max + 10 });
    }
  } else {
    const id = uuid.parse(form.get("id"));
    if (op === "up" || op === "down") await moveRow(schema.galleryImages, id, op);
    else if (op === "remove") await db().delete(schema.galleryImages).where(eq(schema.galleryImages.id, id));
    else await db().update(schema.galleryImages).set({ status: op === "show" ? "active" : "inactive" }).where(eq(schema.galleryImages.id, id));
  }
  await audit({ actorId: user.id, action: `gallery.${op}` });
  invalidate(TAGS.gallery);
  revalidatePath("/admin/gallery");
}

export async function galleryCaptionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin("content.manage");
  const id = uuid.parse(form.get("id"));
  const category = z.enum(categories).catch("general").parse(form.get("category"));
  await db().update(schema.galleryImages).set({ caption: readLocalized(form, "caption", 300), category }).where(eq(schema.galleryImages.id, id));
  invalidate(TAGS.gallery);
  revalidatePath("/admin/gallery");
  return { ok: true, message: "Légende enregistrée." };
}
