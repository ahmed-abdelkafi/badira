/**
 * Cloudflare D1 (SQLite) schema.
 * - UUID text primary keys generated in JS (crypto.randomUUID — Workers & Node).
 * - Timestamps stored as integer milliseconds (Drizzle `timestamp_ms` mode).
 * - Localized / structured values stored as JSON text.
 * - Enums are text columns constrained by Drizzle's `enum` option.
 */
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Localized } from "@/lib/localized";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => new Date();
const timestamps = {
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now).$onUpdateFn(now),
};
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

export const PUBLISH_STATUS = ["active", "inactive", "archived"] as const;
export const RESERVATION_STATUS = ["pending", "confirmed", "declined", "cancelled", "completed"] as const;

/* ------------------------------------------------------------------ */
/* Admin users, roles, sessions, 2FA                                  */
/* ------------------------------------------------------------------ */

export const roles = sqliteTable("roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  permissions: json<string[]>("permissions").notNull().$defaultFn(() => []),
  ...timestamps,
});

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    roleKey: text("role_key")
      .notNull()
      .references(() => roles.key, { onUpdate: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: ts("last_login_at"),
    passwordChangedAt: ts("password_changed_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(sql`lower(${t.email})`)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 (hex) of the opaque cookie token. The raw token is never stored. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    twoFactorVerified: integer("two_factor_verified", { mode: "boolean" }).notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    lastSeenAt: ts("last_seen_at").notNull().$defaultFn(now),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const twoFactorAuth = sqliteTable("two_factor_auth", {
  userId: text("user_id")
    .primaryKey()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  /** AES-256-GCM encrypted base32 secret (iv.tag.ciphertext, base64url). */
  secretEnc: text("secret_enc"),
  /** Secret generated during setup, promoted to secretEnc once a code is verified. */
  pendingSecretEnc: text("pending_secret_enc"),
  enabledAt: ts("enabled_at"),
  /** Last accepted TOTP time step — prevents code replay. */
  lastUsedTimeStep: integer("last_used_time_step"),
  ...timestamps,
});

export const recoveryCodes = sqliteTable(
  "recovery_codes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: ts("used_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("recovery_codes_user_idx").on(t.userId), uniqueIndex("recovery_codes_hash_uq").on(t.codeHash)],
);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    ip: text("ip"),
    success: integer("success", { mode: "boolean" }).notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt), index("login_attempts_ip_idx").on(t.ip, t.createdAt)],
);

/** Generic sliding-window rate limit hits (public forms, 2FA attempts, …). */
export const rateLimitHits = sqliteTable(
  "rate_limit_hits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("rate_limit_hits_key_idx").on(t.key, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Media                                                              */
/* ------------------------------------------------------------------ */

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: id(),
    /** Object key in the R2 bucket. */
    storageKey: text("storage_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    alt: json<Localized>("alt").notNull().$defaultFn(() => ({})),
    blurDataUrl: text("blur_data_url"),
    category: text("category").notNull().default("general"),
    uploadedBy: text("uploaded_by").references(() => adminUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("media_category_idx").on(t.category)],
);

/* ------------------------------------------------------------------ */
/* Suites                                                             */
/* ------------------------------------------------------------------ */

export const suites = sqliteTable(
  "suites",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    /** Proper name — never translated. */
    name: text("name").notNull(),
    collection: text("collection", { enum: ["standard", "legend"] }).notNull(),
    /** Official inventory categories from hotel documentation. */
    inventoryCategory: text("inventory_category", { enum: ["fell", "yasmine", "nour", "legend"] }).notNull(),
    tagline: json<Localized>("tagline").notNull().$defaultFn(() => ({})),
    description: json<Localized>("description").notNull().$defaultFn(() => ({})),
    /** Null = unknown; hidden on the public site. */
    areaSqm: integer("area_sqm"),
    maxOccupancy: integer("max_occupancy"),
    bedConfiguration: json<Localized>("bed_configuration").notNull().$defaultFn(() => ({})),
    view: text("view", { enum: ["garden", "partial_sea", "sea", "pool_and_sea"] }),
    viewDetails: json<Localized>("view_details").notNull().$defaultFn(() => ({})),
    amenities: json<Localized[]>("amenities").notNull().$defaultFn(() => []),
    features: json<Localized[]>("features").notNull().$defaultFn(() => []),
    mainImageId: text("main_image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    status: text("status", { enum: PUBLISH_STATUS }).notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: json<Localized>("seo_title").notNull().$defaultFn(() => ({})),
    seoDescription: json<Localized>("seo_description").notNull().$defaultFn(() => ({})),
    /** Internal notes (e.g. unverified facts) — never shown publicly. */
    internalNotes: text("internal_notes"),
    ...timestamps,
  },
  (t) => [index("suites_status_order_idx").on(t.status, t.sortOrder)],
);

export const suiteImages = sqliteTable(
  "suite_images",
  {
    suiteId: text("suite_id")
      .notNull()
      .references(() => suites.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.suiteId, t.mediaId] }), index("suite_images_order_idx").on(t.suiteId, t.sortOrder)],
);

/* ------------------------------------------------------------------ */
/* Reservations                                                       */
/* ------------------------------------------------------------------ */

export const reservations = sqliteTable(
  "reservations",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    status: text("status", { enum: RESERVATION_STATUS }).notNull().default("pending"),
    /** YYYY-MM-DD */
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    guests: integer("guests").notNull(),
    rooms: integer("rooms").notNull().default(1),
    /** "any", a collection ("standard" | "legend"), an inventory category, or "suite:<slug>". */
    preferredCategory: text("preferred_category").notNull().default("any"),
    preferredSuiteId: text("preferred_suite_id").references(() => suites.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    /** E.164, e.g. +21670018180 */
    phone: text("phone").notNull(),
    locale: text("locale").notNull().default("fr"),
    specialRequests: text("special_requests"),
    consentAt: ts("consent_at").notNull(),
    decidedAt: ts("decided_at"),
    decidedBy: text("decided_by").references(() => adminUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("reservations_status_idx").on(t.status, t.createdAt),
    index("reservations_created_idx").on(t.createdAt),
    index("reservations_checkin_idx").on(t.checkIn),
    index("reservations_email_idx").on(sql`lower(${t.email})`),
  ],
);

export const reservationHistory = sqliteTable(
  "reservation_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    /** created | status_changed | whatsapp_opened | email_sent | email_skipped | note_added */
    action: text("action").notNull(),
    fromStatus: text("from_status", { enum: RESERVATION_STATUS }),
    toStatus: text("to_status", { enum: RESERVATION_STATUS }),
    message: text("message"),
    meta: json<Record<string, unknown>>("meta").notNull().$defaultFn(() => ({})),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("reservation_history_res_idx").on(t.reservationId, t.createdAt)],
);

export const reservationNotes = sqliteTable(
  "reservation_notes",
  {
    id: id(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => adminUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("reservation_notes_res_idx").on(t.reservationId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    failureCount: integer("failure_count").notNull().default(0),
    lastSuccessAt: ts("last_success_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

/** Append-only event log. The admin dashboard polls it for live updates. */
export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    payload: json<Record<string, unknown>>("payload").notNull().$defaultFn(() => ({})),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("notification_events_created_idx").on(t.createdAt)],
);

/** One row per (event, subscription) — guarantees a push is never sent twice. */
export const pushDeliveries = sqliteTable(
  "push_deliveries",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => notificationEvents.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // pending | sent | failed
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.subscriptionId] })],
);

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

const contentColumns = () => ({
  id: id(),
  status: text("status", { enum: PUBLISH_STATUS }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageId: text("image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
});

export const restaurants = sqliteTable("restaurants", {
  ...contentColumns(),
  slug: text("slug").notNull().unique(),
  /** Proper name — never translated. */
  name: text("name").notNull(),
  kind: text("kind").notNull().default("restaurant"), // restaurant | bar
  cuisine: json<Localized>("cuisine").notNull().$defaultFn(() => ({})),
  description: json<Localized>("description").notNull().$defaultFn(() => ({})),
  hours: text("hours"),
  season: json<Localized>("season").notNull().$defaultFn(() => ({})),
  closedDays: json<Localized>("closed_days").notNull().$defaultFn(() => ({})),
  menuUrl: text("menu_url"),
  ...timestamps,
});

export const spaServices = sqliteTable("spa_services", {
  ...contentColumns(),
  kind: text("kind").notNull().default("facility"), // facility | treatment
  title: json<Localized>("title").notNull().$defaultFn(() => ({})),
  description: json<Localized>("description").notNull().$defaultFn(() => ({})),
  durationMinutes: integer("duration_minutes"),
  ...timestamps,
});

export const experiences = sqliteTable("experiences", {
  ...contentColumns(),
  slug: text("slug").notNull().unique(),
  title: json<Localized>("title").notNull().$defaultFn(() => ({})),
  description: json<Localized>("description").notNull().$defaultFn(() => ({})),
  ...timestamps,
});

export const eventOfferings = sqliteTable("event_offerings", {
  ...contentColumns(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").notNull(), // wedding | business | private
  title: json<Localized>("title").notNull().$defaultFn(() => ({})),
  description: json<Localized>("description").notNull().$defaultFn(() => ({})),
  brochureUrl: text("brochure_url"),
  ...timestamps,
});

export const galleryImages = sqliteTable(
  "gallery_images",
  {
    id: id(),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("architecture"),
    caption: json<Localized>("caption").notNull().$defaultFn(() => ({})),
    status: text("status", { enum: PUBLISH_STATUS }).notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("gallery_order_idx").on(t.status, t.sortOrder)],
);

export const testimonials = sqliteTable("testimonials", {
  id: id(),
  author: text("author").notNull(),
  origin: text("origin"),
  quote: json<Localized>("quote").notNull().$defaultFn(() => ({})),
  source: text("source"),
  stayDate: text("stay_date"),
  status: text("status", { enum: PUBLISH_STATUS }).notNull().default("inactive"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export type PageSection = {
  visible?: boolean;
  eyebrow?: Localized;
  title?: Localized;
  body?: Localized;
  imageId?: string | null;
};

/** Per-page SEO + homepage section configuration. */
export const pages = sqliteTable("pages", {
  key: text("key").primaryKey(),
  seoTitle: json<Localized>("seo_title").notNull().$defaultFn(() => ({})),
  seoDescription: json<Localized>("seo_description").notNull().$defaultFn(() => ({})),
  ogImageId: text("og_image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  heroImageId: text("hero_image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  sections: json<Record<string, PageSection>>("sections").notNull().$defaultFn(() => ({})),
  ...timestamps,
});

export const translations = sqliteTable(
  "translations",
  {
    id: id(),
    locale: text("locale").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("translations_locale_key_uq").on(t.locale, t.key)],
);

/** Site-wide settings (contact details, WhatsApp, social links…). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
  ...timestamps,
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorId: text("actor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    meta: json<Record<string, unknown>>("meta").notNull().$defaultFn(() => ({})),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);
