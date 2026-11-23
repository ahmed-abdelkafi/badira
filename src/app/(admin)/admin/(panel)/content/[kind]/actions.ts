"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/dal";
import { ContentError, moveRow } from "@/server/services/content";
import { deleteCollectionItem, getCollection, saveCollectionItem, setCollectionStatus } from "@/server/services/collections";
import { invalidate, TAGS, type ActionState } from "@/server/services/admin-helpers";

const uuid = z.uuid();

function config(kind: FormDataEntryValue | null) {
  const c = getCollection(String(kind ?? ""));
  if (!c) throw new Error("Unknown collection");
  return c;
}

export async function saveItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  const c = config(form.get("kind"));
  const rawId = form.get("id");
  try {
    await saveCollectionItem(user.id, c, form, typeof rawId === "string" && rawId ? uuid.parse(rawId) : null);
  } catch (err) {
    if (err instanceof ContentError) return { error: err.message };
    throw err;
  }
  invalidate(c.tag, TAGS.media);
  revalidatePath(`/admin/content/${c.kind}`);
  return { ok: true, message: "Enregistré et publié." };
}

export async function itemOpAction(form: FormData) {
  const user = await requireAdmin("content.manage");
  const c = config(form.get("kind"));
  const id = uuid.parse(form.get("id"));
  const op = z.enum(["up", "down", "activate", "deactivate", "delete"]).parse(form.get("op"));
  if (op === "up" || op === "down") await moveRow(c.table, id, op);
  else if (op === "delete") await deleteCollectionItem(user.id, c, id);
  else await setCollectionStatus(user.id, c, id, op === "activate" ? "active" : "inactive");
  invalidate(c.tag);
  revalidatePath(`/admin/content/${c.kind}`);
}
