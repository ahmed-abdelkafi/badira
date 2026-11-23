"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/dal";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { PageSection } from "@/server/db/schema";
import { readLocalized, readUuid } from "@/server/services/content";
import { invalidate, TAGS, type ActionState } from "@/server/services/admin-helpers";
import { HOME_SECTIONS, PAGE_KEYS } from "@/server/services/pages-config";

export async function savePageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin("content.manage");
  const key = z.enum(PAGE_KEYS).parse(form.get("key"));
  const values = {
    seoTitle: readLocalized(form, "seoTitle", 120),
    seoDescription: readLocalized(form, "seoDescription", 320),
    heroImageId: readUuid(form, "heroImageId"),
    ogImageId: readUuid(form, "ogImageId"),
  };
  let sections: Record<string, PageSection> | undefined;
  if (key === "home") {
    sections = {};
    for (const s of HOME_SECTIONS) {
      sections[s.key] = {
        visible: form.get(`sec.${s.key}.visible`) === "on",
        imageId: s.image ? readUuid(form, `sec.${s.key}.imageId`) : null,
        eyebrow: readLocalized(form, `sec.${s.key}.eyebrow`, 120),
        title: readLocalized(form, `sec.${s.key}.title`, 200),
        body: readLocalized(form, `sec.${s.key}.body`, 1200),
      };
    }
  }
  await db()
    .insert(schema.pages)
    .values({ key, ...values, sections: sections ?? {} })
    .onConflictDoUpdate({ target: schema.pages.key, set: { ...values, ...(sections ? { sections } : {}) } });
  await audit({ actorId: user.id, action: "page.updated", entityType: "page", entityId: key });
  invalidate(TAGS.pages, `page:${key}`);
  revalidatePath("/admin/pages");
  return { ok: true, message: "Page enregistrée et publiée." };
}
