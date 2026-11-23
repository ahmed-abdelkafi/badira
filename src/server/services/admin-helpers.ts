import "server-only";
import { desc } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { t } from "@/lib/localized";
import { TAGS } from "@/server/content/queries";

/**
 * Hook called after every admin edit. Public pages currently render per
 * request from D1 (no cross-request cache), so edits are live immediately and
 * there is nothing to purge. If a data cache is added later, purge it here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invalidate(..._tags: string[]) {}

export { TAGS };

export async function listMediaOptions() {
  const rows = await db().select().from(schema.mediaAssets).orderBy(desc(schema.mediaAssets.createdAt));
  return rows.map((m) => ({
    id: m.id,
    src: `/media/${m.storageKey}`,
    alt: t(m.alt, "fr") || m.originalName,
    width: m.width,
    height: m.height,
    category: m.category,
  }));
}

export type ActionState = { ok?: boolean; error?: string; message?: string };
