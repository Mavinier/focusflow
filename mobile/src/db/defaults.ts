import { eq } from 'drizzle-orm'

import type { AppDatabase } from './database'
import { activities, appSettings, weeklyGoals } from './schema'

export const DEFAULT_WEEKLY_TARGET_MINUTES = 10 * 60

export const DEFAULT_APP_SETTINGS = {
  id: 1,
  displayName: 'Marlon Moura',
  defaultWeeklyTargetMinutes: DEFAULT_WEEKLY_TARGET_MINUTES,
  weekStartsOn: 1,
  theme: 'dark',
  notificationsEnabled: 1,
  goalNotificationsEnabled: 1,
  streakNotificationsEnabled: 1,
  inactivityNotificationsEnabled: 1,
  inactivityThresholdDays: 3,
} as const

/**
 * These are starter areas only. Seeding does not create demo sessions, so a
 * new mobile install opens with an empty history while still being ready to
 * log the common FocusFlow areas.
 */
export const DEFAULT_ACTIVITY_DEFINITIONS = [
  { name: 'Java', color: '#d8f26b', icon: 'code' },
  { name: 'SQL', color: '#7ed6c0', icon: 'database' },
  { name: 'NoSQL', color: '#c2a6ff', icon: 'database' },
  { name: 'Project work', color: '#a8b9ff', icon: 'work' },
  { name: 'Reading', color: '#f5b97d', icon: 'book' },
  { name: 'Notes & review', color: '#ff9eaa', icon: 'notes' },
] as const

export function seedDefaults(database: AppDatabase) {
  database.transaction((tx) => {
    const existingSettings = tx
      .select({ id: appSettings.id })
      .from(appSettings)
      .where(eq(appSettings.id, DEFAULT_APP_SETTINGS.id))
      .get()

    if (!existingSettings) {
      tx.insert(appSettings).values(DEFAULT_APP_SETTINGS).run()
    }

    for (const definition of DEFAULT_ACTIVITY_DEFINITIONS) {
      const existingActivity = tx
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.name, definition.name))
        .get()

      if (!existingActivity) {
        tx.insert(activities).values(definition).run()
      }
    }

    const weekStart = getWeekStart(getDateKey())
    const existingGoal = tx
      .select({ id: weeklyGoals.id })
      .from(weeklyGoals)
      .where(eq(weeklyGoals.weekStart, weekStart))
      .get()

    if (!existingGoal) {
      tx
        .insert(weeklyGoals)
        .values({ weekStart, targetMinutes: DEFAULT_WEEKLY_TARGET_MINUTES })
        .run()
    }
  })
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getWeekStart(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  date.setDate(date.getDate() - daysFromMonday)
  return date.toISOString().slice(0, 10)
}
