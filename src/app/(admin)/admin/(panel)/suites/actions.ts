"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/dal";
import { schema } from "@/server/db";
import {
  addSuiteImages,
  ContentError,
  createSuite,
  deleteSuite,
  moveRow,
  moveSuiteImage,
  parseSuiteForm,
  removeSuiteImage,
  setSuiteMainImage,
  setSuiteStatus,
  updateSuite,
} from "@/server/services/content";
import { ingestImage, MediaError } from "@/server/media/service";
import { invalidate, TAGS, type ActionState } from "@/server/services/admin-helpers";

const uuid = z.uuid();

export async function saveSuiteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  const id = form.get("id");
  try {
    const input = parseSuiteForm(form);
    if (typeof id === "string" && id) {
      const { row, previousSlug } = await updateSuite(user.id, uuid.parse(id), input);
      invalidate(TAGS.suites, `suite:${row.slug}`, `suite:${previousSlug}`);
      revalidatePath(`/admin/suites/${row.id}`);
      return { ok: true, message: "Suite enregistrée. Le site public est à jour." };
    }
    const row = await createSuite(user.id, input);
    invalidate(TAGS.suites);
    redirect(`/admin/suites/${row.id}?created=1`);
  } catch (err) {
    if (err instanceof ContentError) return { error: err.message };
    throw err;
  }
}

export async function suiteStatusAction(form: FormData) {
  const user = await requireAdmin("content.manage");
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["active", "inactive", "archived"]).parse(form.get("status"));
  const row = await setSuiteStatus(user.id, id, status);
  invalidate(TAGS.suites, `suite:${row.slug}`);
  revalidatePath("/admin/suites");
  revalidatePath(`/admin/suites/${id}`);
}

export async function deleteSuiteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  try {
    const s = await deleteSuite(user.id, uuid.parse(form.get("id")));
    invalidate(TAGS.suites, `suite:${s.slug}`);
  } catch (err) {
    if (err instanceof ContentError) return { error: err.message };
    throw err;
  }
  redirect("/admin/suites");
}

export async function moveSuiteAction(form: FormData) {
  await requireAdmin("content.manage");
  await moveRow(schema.suites, uuid.parse(form.get("id")), z.enum(["up", "down"]).parse(form.get("dir")));
  invalidate(TAGS.suites);
  revalidatePath("/admin/suites");
}

/** Upload one or more files and attach them to the suite gallery. */
export async function uploadSuiteImagesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  const suiteId = uuid.parse(form.get("suiteId"));
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const existing = form.getAll("mediaIds").filter((v): v is string => typeof v === "string" && uuid.safeParse(v).success);
  if (!files.length && !existing.length) return { error: "Sélectionnez au moins une image." };
  if (files.length > 20) return { error: "20 fichiers maximum par envoi." };
  const ids: string[] = [...existing];
  const errors: string[] = [];
  for (const f of files) {
    try {
      const m = await ingestImage({ data: new Uint8Array(await f.arrayBuffer()), originalName: f.name, category: "suites", uploadedBy: user.id });
      ids.push(m.id);
    } catch (err) {
      if (err instanceof MediaError) errors.push(`${f.name} : ${err.message}`);
      else throw err;
    }
  }
  await addSuiteImages(user.id, suiteId, ids);
  invalidate(TAGS.suites, TAGS.media);
  revalidatePath(`/admin/suites/${suiteId}`);
  return errors.length ? { ok: ids.length > 0, error: errors.join(" · "), message: `${ids.length} image(s) ajoutée(s).` } : { ok: true, message: `${ids.length} image(s) ajoutée(s).` };
}

export async function suiteImageAction(form: FormData) {
  const user = await requireAdmin("content.manage");
  const suiteId = uuid.parse(form.get("suiteId"));
  const mediaId = uuid.parse(form.get("mediaId"));
  const op = z.enum(["main", "remove", "up", "down"]).parse(form.get("op"));
  if (op === "main") await setSuiteMainImage(user.id, suiteId, mediaId);
  else if (op === "remove") await removeSuiteImage(user.id, suiteId, mediaId);
  else await moveSuiteImage(suiteId, mediaId, op);
  invalidate(TAGS.suites);
  revalidatePath(`/admin/suites/${suiteId}`);
}
