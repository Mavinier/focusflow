CREATE TABLE `weekly_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`target_minutes` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_goals_week_start_idx` ON `weekly_goals` (`week_start`);