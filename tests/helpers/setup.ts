import { beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/server/db/schema";
import { setTestDb, type DB } from "@/server/db";
import { MemoryStorage, setTestStorage } from "@/server/media/storage";

process.env.TOTP_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
process.env.SITE_URL = "http://localhost:3000";
// Never send real push notifications from tests.
process.env.VAPID_PRIVATE_KEY ??= "";

/**
 * Each test file gets a fresh in-memory SQLite database built from the same
 * migrations as Cloudflare D1 (same SQL dialect), plus in-memory media storage.
 */
beforeAll(async () => {
  const client = createClient({ url: ":memory:" });
  const database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: "drizzle" });
  setTestDb(database as unknown as DB);
  setTestStorage(new MemoryStorage());
});
