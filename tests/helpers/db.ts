import { sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { defaultRoles } from "@/server/auth/permissions";

const TABLES = [
  "audit_logs", "push_deliveries", "notification_events", "push_subscriptions", "reservation_notes", "reservation_history",
  "reservations", "suite_images", "gallery_images", "suites", "restaurants", "spa_services", "experiences", "event_offerings",
  "testimonials", "pages", "translations", "settings", "media_assets", "rate_limit_hits", "login_attempts", "password_reset_tokens",
  "recovery_codes", "two_factor_auth", "sessions", "admin_users", "roles",
];

/** Empty every table (FK-safe order) and re-insert roles. */
export async function resetDb() {
  for (const t of TABLES) await db().run(sql.raw(`DELETE FROM "${t}"`));
  await db().insert(schema.roles).values(defaultRoles);
}
