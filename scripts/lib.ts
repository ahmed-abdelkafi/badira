/** Shared helpers for CLI scripts (Node). */
import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../src/server/db/schema";
import type { DB } from "../src/server/db";

// Secrets: .prod.vars for --remote (production), .dev.vars locally — like wrangler.
config({ path: process.argv.includes("--remote") ? ".prod.vars" : ".dev.vars", quiet: true });
config({ quiet: true });

export const DB_NAME = "la-badira";
export const BUCKET = "la-badira-media";

/** `--remote` targets the deployed Cloudflare resources; default is local (Miniflare state in .wrangler/). */
export function target(): "--local" | "--remote" {
  return process.argv.includes("--remote") ? "--remote" : "--local";
}

export function wrangler(args: string[], opts: { capture?: boolean } = {}): string {
  // Run wrangler's JS entry with this Node binary: no shell, so arguments are never re-split.
  const out = execFileSync(process.execPath, [path.resolve("node_modules/wrangler/bin/wrangler.js"), ...args], {
    encoding: "utf8",
    stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  return out ?? "";
}

/** Run a read query against D1 and return rows. */
export function d1Query<T = Record<string, unknown>>(sqlText: string): T[] {
  const out = wrangler(["d1", "execute", DB_NAME, target(), "--json", "--command", sqlText], { capture: true });
  const start = out.indexOf("[");
  const parsed = JSON.parse(out.slice(start)) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

/** SQL literal for SQLite. */
export function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** In-memory SQLite with the app's migrations applied (used to build seed data). */
export async function memoryDb(): Promise<{ db: DB; client: ReturnType<typeof createClient> }> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db: db as unknown as DB, client };
}
