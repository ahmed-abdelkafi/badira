import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";

/**
 * Sliding-window rate limit stored in PostgreSQL, so it holds across
 * multiple server instances. Returns true when the hit is allowed.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(schema.rateLimitHits)
    .where(and(eq(schema.rateLimitHits.key, key), gte(schema.rateLimitHits.createdAt, since)));
  if (count >= limit) return false;
  await db().insert(schema.rateLimitHits).values({ key });
  // Opportunistic cleanup (≈1% of calls).
  if (Math.random() < 0.01) {
    await db()
      .delete(schema.rateLimitHits)
      .where(lt(schema.rateLimitHits.createdAt, new Date(Date.now() - 24 * 3600_000)));
  }
  return true;
}
