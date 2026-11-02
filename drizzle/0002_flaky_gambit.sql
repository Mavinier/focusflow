CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`default_weekly_target_minutes` integer NOT NULL,
	`week_starts_on` integer NOT NULL,
	`theme` text NOT NULL,
	`notifications_enabled` integer NOT NULL,
	`goal_notifications_enabled` integer NOT NULL,
	`streak_notifications_enabled` integer NOT NULL,
	`inactivity_notifications_enabled` integer NOT NULL,
	`inactivity_threshold_days` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_key` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`href` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_event_key_idx` ON `notifications` (`event_key`);