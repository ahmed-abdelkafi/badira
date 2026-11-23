import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

/** Async SQLite database (Cloudflare D1 in production, libSQL in tests). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = BaseSQLiteDatabase<"async", any, typeof schema>;

const g = globalThis as unknown as { __badiraTestDb?: DB };

/** Test hook: route all queries to an injected database. */
export function setTestDb(database: DB | undefined) {
  g.__badiraTestDb = database;
}

/**
 * Database for the current request. D1 bindings are per-request objects on
 * Workers, so the Drizzle wrapper is created on demand (it is cheap).
 */
export function db(): DB {
  if (g.__badiraTestDb) return g.__badiraTestDb;
  const { env } = getCloudflareContext();
  if (!env.DB) throw new Error("D1 binding `DB` is not configured (see wrangler.jsonc)");
  return drizzle(env.DB, { schema }) as unknown as DB;
}

/** Run statements atomically (D1 has no interactive transactions → batch). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function batch(queries: unknown[]): Promise<any[]> {
  if (!queries.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db() as any).batch(queries);
}

/** True when a SQLite/D1 error is a UNIQUE constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  const msg = `${(err as Error)?.message ?? ""} ${((err as { cause?: Error })?.cause?.message) ?? ""}`;
  return /UNIQUE constraint failed/i.test(msg);
}

export { schema };
