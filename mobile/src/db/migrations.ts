/**
 * Expo bundles migrations as a JavaScript object instead of reading .sql
 * files at runtime. The SQL source and journal are also checked in under
 * mobile/drizzle and are generated with `drizzle-kit generate`.
 */
const migrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: 1793630840569,
        tag: '0000_bumpy_ezekiel',
        breakpoints: true,
      },
      {
        idx: 1,
        when: 1793640663857,
        tag: '0001_archive_activity_areas',
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: `CREATE TABLE \`activities\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`name\` text NOT NULL,
\t\`color\` text NOT NULL,
\t\`icon\` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`activities_name_idx\` ON \`activities\` (\`name\`);--> statement-breakpoint
CREATE TABLE \`app_settings\` (
\t\`id\` integer PRIMARY KEY NOT NULL,
\t\`display_name\` text NOT NULL,
\t\`default_weekly_target_minutes\` integer NOT NULL,
\t\`week_starts_on\` integer NOT NULL,
\t\`theme\` text NOT NULL,
\t\`notifications_enabled\` integer NOT NULL,
\t\`goal_notifications_enabled\` integer NOT NULL,
\t\`streak_notifications_enabled\` integer NOT NULL,
\t\`inactivity_notifications_enabled\` integer NOT NULL,
\t\`inactivity_threshold_days\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`daily_notes\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_date\` text NOT NULL,
\t\`note\` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`daily_notes_date_idx\` ON \`daily_notes\` (\`activity_date\`);--> statement-breakpoint
CREATE TABLE \`focus_sessions\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_id\` integer NOT NULL,
\t\`activity_date\` text NOT NULL,
\t\`started_at\` text,
\t\`ended_at\` text,
\t\`duration_minutes\` integer NOT NULL,
\t\`note\` text,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`notifications\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`event_key\` text NOT NULL,
\t\`type\` text NOT NULL,
\t\`title\` text NOT NULL,
\t\`message\` text NOT NULL,
\t\`href\` text NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`read_at\` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`notifications_event_key_idx\` ON \`notifications\` (\`event_key\`);--> statement-breakpoint
CREATE TABLE \`weekly_goals\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`week_start\` text NOT NULL,
\t\`target_minutes\` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`weekly_goals_week_start_idx\` ON \`weekly_goals\` (\`week_start\`);`,
    m0001: `ALTER TABLE \`activities\` ADD \`is_active\` integer DEFAULT 1 NOT NULL;`,
  },
}

export default migrations
