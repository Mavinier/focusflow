import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { db } from '../db/client'
import { appSettings, focusSessions, notifications, weeklyGoals } from '../db/schema'
import { getTodayDateKey, addDays, toDateKey } from '../../src/utils/tracker'
import { DEFAULT_WEEKLY_TARGET_MINUTES, getWeekEnd, getWeekStart } from './week'

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

export function ensureAppSettings() {
  const existing = db.select().from(appSettings).limit(1).get()
  if (existing) return existing

  return db.insert(appSettings).values(DEFAULT_APP_SETTINGS).returning().get()
}

export function serializeSettings(settings: ReturnType<typeof ensureAppSettings>) {
  return {
    ...settings,
    theme: settings.theme as 'dark',
    notificationsEnabled: Boolean(settings.notificationsEnabled),
    goalNotificationsEnabled: Boolean(settings.goalNotificationsEnabled),
    streakNotificationsEnabled: Boolean(settings.streakNotificationsEnabled),
    inactivityNotificationsEnabled: Boolean(settings.inactivityNotificationsEnabled),
  }
}

export function syncNotifications() {
  const settings = ensureAppSettings()
  if (!settings.notificationsEnabled) return

  const today = getTodayDateKey()
  const weekStart = getWeekStart(today)
  const weeklyGoal = db
    .select()
    .from(weeklyGoals)
    .where(eq(weeklyGoals.weekStart, weekStart))
    .get()
  const targetMinutes = weeklyGoal?.targetMinutes ?? settings.defaultWeeklyTargetMinutes
  const weekSessions = db
    .select({ duration: focusSessions.durationMinutes })
    .from(focusSessions)
    .where(
      and(
        gte(focusSessions.activityDate, weekStart),
        lte(focusSessions.activityDate, getWeekEnd(weekStart)),
      ),
    )
    .all()
  const trackedMinutes = weekSessions.reduce((total, session) => total + session.duration, 0)

  if (settings.goalNotificationsEnabled && trackedMinutes >= targetMinutes) {
    createNotification(
      `weekly-goal:${weekStart}:met`,
      'goal',
      'Weekly goal reached',
      `You have focused for ${formatDuration(trackedMinutes)} this week.`,
      '/goals',
    )
  } else if (
    settings.goalNotificationsEnabled &&
    trackedMinutes >= Math.round(targetMinutes * 0.8)
  ) {
    createNotification(
      `weekly-goal:${weekStart}:near`,
      'goal',
      'You are close to your weekly goal',
      `${formatDuration(targetMinutes - trackedMinutes)} left to reach this week’s target.`,
      '/goals',
    )
  }

  const activeDates = db
    .select({ activityDate: focusSessions.activityDate })
    .from(focusSessions)
    .all()
    .map((session) => session.activityDate)
    .filter((date) => date <= today)
  const uniqueDates = Array.from(new Set(activeDates)).sort()
  const latestActiveDate = uniqueDates.at(-1)

  if (!latestActiveDate) return

  if (settings.streakNotificationsEnabled) {
    const streak = calculateStreak(uniqueDates, latestActiveDate)
    const milestones = [3, 7, 14, 30, 60, 100]
    const milestone = milestones.filter((value) => streak >= value).at(-1)

    if (milestone) {
      createNotification(
        `streak:${latestActiveDate}:${milestone}`,
        'streak',
        `${milestone}-day focus streak`,
        `You have kept your focus moving for ${milestone} consecutive active days.`,
        '/',
      )
    }
  }

  if (settings.inactivityNotificationsEnabled) {
    const inactiveDays = countDaysBetween(latestActiveDate, today) - 1
    if (inactiveDays >= settings.inactivityThresholdDays) {
      createNotification(
        `inactivity:${today}`,
        'reminder',
        'A small step is waiting',
        `It has been ${inactiveDays} days since your last logged activity.`,
        '/',
      )
    }
  }
}

export function listNotifications() {
  syncNotifications()
  const notificationRows = db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(40)
    .all()
  const unreadCount = db
    .select({ id: notifications.id })
    .from(notifications)
    .where(isNull(notifications.readAt))
    .all().length

  return { notifications: notificationRows, unreadCount }
}

function createNotification(
  eventKey: string,
  type: string,
  title: string,
  message: string,
  href: string,
) {
  const existing = db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.eventKey, eventKey))
    .get()
  if (existing) return

  db.insert(notifications)
    .values({
      eventKey,
      type,
      title,
      message,
      href,
      createdAt: new Date().toISOString(),
    })
    .run()
}

function calculateStreak(activeDates: string[], latestDate: string) {
  const dateSet = new Set(activeDates)
  let streak = 0
  let cursor = new Date(`${latestDate}T12:00:00`)

  while (dateSet.has(toDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function countDaysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes}m`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}
