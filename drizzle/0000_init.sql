CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role_key` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`password_changed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_uq` ON `admin_users` (lower("email"));--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`meta` text NOT NULL,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `event_offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`image_id` text,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`brochure_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_offerings_slug_unique` ON `event_offerings` (`slug`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`image_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiences_slug_unique` ON `experiences` (`slug`);--> statement-breakpoint
CREATE TABLE `gallery_images` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`category` text DEFAULT 'architecture' NOT NULL,
	`caption` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_order_idx` ON `gallery_images` (`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`ip` text,
	`success` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_email_idx` ON `login_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_ip_idx` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`alt` text NOT NULL,
	`blur_data_url` text,
	`category` text DEFAULT 'general' NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_storage_key_unique` ON `media_assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `media_category_idx` ON `media_assets` (`category`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_events_created_idx` ON `notification_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `pages` (
	`key` text PRIMARY KEY NOT NULL,
	`seo_title` text NOT NULL,
	`seo_description` text NOT NULL,
	`og_image_id` text,
	`hero_image_id` text,
	`sections` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`og_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`hero_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `push_deliveries` (
	`event_id` integer NOT NULL,
	`subscription_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `subscription_id`),
	FOREIGN KEY (`event_id`) REFERENCES `notification_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`last_success_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limit_hits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_hits_key_idx` ON `rate_limit_hits` (`key`,`created_at`);--> statement-breakpoint
CREATE TABLE `recovery_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recovery_codes_user_idx` ON `recovery_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recovery_codes_hash_uq` ON `recovery_codes` (`code_hash`);--> statement-breakpoint
CREATE TABLE `reservation_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`message` text,
	`meta` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reservation_history_res_idx` ON `reservation_history` (`reservation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reservation_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`author_id` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reservation_notes_res_idx` ON `reservation_notes` (`reservation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`guests` integer NOT NULL,
	`rooms` integer DEFAULT 1 NOT NULL,
	`preferred_category` text DEFAULT 'any' NOT NULL,
	`preferred_suite_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`locale` text DEFAULT 'fr' NOT NULL,
	`special_requests` text,
	`consent_at` integer NOT NULL,
	`decided_at` integer,
	`decided_by` text,
	`confirmation_email_sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`preferred_suite_id`) REFERENCES `suites`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_reference_unique` ON `reservations` (`reference`);--> statement-breakpoint
CREATE INDEX `reservations_status_idx` ON `reservations` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `reservations_created_idx` ON `reservations` (`created_at`);--> statement-breakpoint
CREATE INDEX `reservations_checkin_idx` ON `reservations` (`check_in`);--> statement-breakpoint
CREATE INDEX `reservations_email_idx` ON `reservations` (lower("email"));--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`image_id` text,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'restaurant' NOT NULL,
	`cuisine` text NOT NULL,
	`description` text NOT NULL,
	`hours` text,
	`season` text NOT NULL,
	`closed_days` text NOT NULL,
	`menu_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE TABLE `roles` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`permissions` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`two_factor_verified` integer DEFAULT false NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spa_services` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`image_id` text,
	`kind` text DEFAULT 'facility' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`duration_minutes` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `suite_images` (
	`suite_id` text NOT NULL,
	`media_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`suite_id`, `media_id`),
	FOREIGN KEY (`suite_id`) REFERENCES `suites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `suite_images_order_idx` ON `suite_images` (`suite_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `suites` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`collection` text NOT NULL,
	`inventory_category` text NOT NULL,
	`tagline` text NOT NULL,
	`description` text NOT NULL,
	`area_sqm` integer,
	`max_occupancy` integer,
	`bed_configuration` text NOT NULL,
	`view` text,
	`view_details` text NOT NULL,
	`amenities` text NOT NULL,
	`features` text NOT NULL,
	`main_image_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`seo_title` text NOT NULL,
	`seo_description` text NOT NULL,
	`internal_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`main_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suites_slug_unique` ON `suites` (`slug`);--> statement-breakpoint
CREATE INDEX `suites_status_order_idx` ON `suites` (`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`origin` text,
	`quote` text NOT NULL,
	`source` text,
	`stay_date` text,
	`status` text DEFAULT 'inactive' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translations_locale_key_uq` ON `translations` (`locale`,`key`);--> statement-breakpoint
CREATE TABLE `two_factor_auth` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret_enc` text,
	`pending_secret_enc` text,
	`enabled_at` integer,
	`last_used_time_step` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
