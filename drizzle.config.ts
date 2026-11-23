import { defineConfig } from "drizzle-kit";

/** Generates SQL migrations for D1; apply them with `wrangler d1 migrations apply`. */
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  strict: true,
});
