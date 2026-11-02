import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const activities = sqliteTable(
  'activities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
  },
  (table) => ({
    nameIndex: uniqueIndex('activities_name_idx').on(table.name),
  }),
)

export const focusSessions = sqliteTable('focus_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id')
    .notNull()
    .references(() => activities.id, { onDelete: 'cascade' }),
  activityDate: text('activity_date').notNull(),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  durationMinutes: integer('duration_minutes').notNull(),
  note: text('note'),
})

export const dailyNotes = sqliteTable(
  'daily_notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    activityDate: text('activity_date').notNull(),
    note: text('note').notNull(),
  },
  (table) => ({
    dateIndex: uniqueIndex('daily_notes_date_idx').on(table.activityDate),
  }),
)

export const weeklyGoals = sqliteTable(
  'weekly_goals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    weekStart: text('week_start').notNull(),
    targetMinutes: integer('target_minutes').notNull(),
  },
  (table) => ({
    weekStartIndex: uniqueIndex('weekly_goals_week_start_idx').on(table.weekStart),
  }),
)

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey(),
  displayName: text('display_name').notNull(),
  defaultWeeklyTargetMinutes: integer('default_weekly_target_minutes').notNull(),
  weekStartsOn: integer('week_starts_on').notNull(),
  theme: text('theme').notNull(),
  notificationsEnabled: integer('notifications_enabled').notNull(),
  goalNotificationsEnabled: integer('goal_notifications_enabled').notNull(),
  streakNotificationsEnabled: integer('streak_notifications_enabled').notNull(),
  inactivityNotificationsEnabled: integer('inactivity_notifications_enabled').notNull(),
  inactivityThresholdDays: integer('inactivity_threshold_days').notNull(),
})

export const notifications = sqliteTable(
  'notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eventKey: text('event_key').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    href: text('href').notNull(),
    createdAt: text('created_at').notNull(),
    readAt: text('read_at'),
  },
  (table) => ({
    eventKeyIndex: uniqueIndex('notifications_event_key_idx').on(table.eventKey),
  }),
)
