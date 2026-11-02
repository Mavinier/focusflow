CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_name_idx` ON `activities` (`name`);--> statement-breakpoint
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
CREATE TABLE `daily_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_date` text NOT NULL,
	`note` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_notes_date_idx` ON `daily_notes` (`activity_date`);--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`activity_date` text NOT NULL,
	`started_at` text,
	`ended_at` text,
	`duration_minutes` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
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
CREATE UNIQUE INDEX `notifications_event_key_idx` ON `notifications` (`event_key`);--> statement-breakpoint
CREATE TABLE `weekly_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`target_minutes` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_goals_week_start_idx` ON `weekly_goals` (`week_start`);