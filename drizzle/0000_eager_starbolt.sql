CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_name_idx` ON `activities` (`name`);--> statement-breakpoint
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
