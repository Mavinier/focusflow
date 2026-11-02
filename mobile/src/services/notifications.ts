import * as Notifications from 'expo-notifications'

import { repositories } from '../db/repositories'
import { calculateWeeklyGoalProgress } from '../utils/goals'
import { streakFromSessions } from '../utils/insights'
import {
  addDays,
  getTodayDateKey,
  parseDateKey,
  toDateKey,
} from '../utils/tracker'

const REMINDER_MARKER = 'focusflow-local-reminder'
const REMINDER_HOUR = 19

export type NotificationPermission = 'granted' | 'denied' | 'undetermined'

export type ReminderSyncResult = {
  permission: NotificationPermission
  scheduledCount: number
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const permissions = await Notifications.getPermissionsAsync()
  return normalizePermission(permissions.status)
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const permissions = await Notifications.requestPermissionsAsync()
  return normalizePermission(permissions.status)
}

export async function refreshLocalReminders(): Promise<ReminderSyncResult> {
  await cancelManagedReminders()

  const permission = await getNotificationPermission()
  const settings = repositories.appSettings.get()
  if (!settings?.notificationsEnabled) {
    return { permission, scheduledCount: 0 }
  }

  if (permission !== 'granted') return { permission, scheduledCount: 0 }

  let scheduledCount = 0
  const sessions = repositories.focusSessions.listWithActivities()
  const today = getTodayDateKey()

  if (settings.inactivityNotificationsEnabled) {
    const latestActivity = sessions[0]?.activityDate ?? today
    const reminderDate = nextReminderDate(
      addDays(parseDateKey(latestActivity), settings.inactivityThresholdDays),
      today,
    )

    await scheduleManagedReminder({
      body: 'A short focus block is enough to keep your momentum moving.',
      date: reminderDate,
      event: 'inactivity',
      title: 'Ready for your next focus block?',
    })
    scheduledCount += 1
  }

  if (settings.goalNotificationsEnabled) {
    const weeklyProgress = calculateWeeklyGoalProgress(
      today,
      sessions,
      repositories.weeklyGoals.getByWeekStart(getWeekStart(today))?.targetMinutes
        ?? settings.defaultWeeklyTargetMinutes,
    )

    if (weeklyProgress.remainingMinutes > 0) {
      const reminderDate = nextWeeklyReminderDate(today)
      await scheduleManagedReminder({
        body: `${formatMinutes(weeklyProgress.remainingMinutes)} left to reach this week's goal.`,
        date: reminderDate,
        event: 'weekly-goal',
        title: 'Your weekly goal is still within reach',
      })
      scheduledCount += 1
    }
  }

  const currentStreak = streakFromSessions(sessions)
  if (settings.streakNotificationsEnabled && currentStreak >= 2) {
    await scheduleManagedReminder({
      body: `You are on a ${currentStreak}-day streak. A short session keeps it moving.`,
      date: nextReminderDate(parseDateKey(today), today),
      event: 'streak',
      title: 'Keep your focus streak alive',
    })
    scheduledCount += 1
  }

  return { permission, scheduledCount }
}

export async function cancelManagedReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()

  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.focusflow === REMINDER_MARKER)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  )
}

async function scheduleManagedReminder({
  body,
  date,
  event,
  title,
}: {
  body: string
  date: Date
  event: string
  title: string
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      body,
      data: { event, focusflow: REMINDER_MARKER },
      sound: false,
      title,
    },
    trigger: { date, type: Notifications.SchedulableTriggerInputTypes.DATE },
  })
}

function nextReminderDate(candidate: Date, today: string) {
  const date = new Date(candidate)
  date.setHours(REMINDER_HOUR, 0, 0, 0)

  if (toDateKey(date) <= today) {
    date.setDate(date.getDate() + 1)
  }

  return date
}

function nextWeeklyReminderDate(today: string) {
  const date = parseDateKey(today)
  const day = date.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  date.setDate(date.getDate() + daysUntilSunday)
  date.setHours(REMINDER_HOUR, 0, 0, 0)

  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 7)
  return date
}

function getWeekStart(dateKey: string) {
  const date = parseDateKey(dateKey)
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  return toDateKey(addDays(date, -daysFromMonday))
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (!hours) return `${remaining}m`
  if (!remaining) return `${hours}h`
  return `${hours}h ${remaining}m`
}

function normalizePermission(status: Notifications.PermissionStatus): NotificationPermission {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted'
  if (status === Notifications.PermissionStatus.DENIED) return 'denied'
  return 'undetermined'
}
