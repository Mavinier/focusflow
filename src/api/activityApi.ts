import type { ActivityIconName, DayData } from '../types/tracker'

type DashboardResponse = {
  year: number
  records: DayData
}

export type ActivityOption = {
  id: number
  name: string
  color: string
  icon: ActivityIconName
}

export type UpdateActivityInput = {
  name?: string
  color?: string
  icon?: ActivityIconName
}

export type AppSettings = {
  id: number
  displayName: string
  defaultWeeklyTargetMinutes: number
  weekStartsOn: number
  theme: 'dark'
  notificationsEnabled: boolean
  goalNotificationsEnabled: boolean
  streakNotificationsEnabled: boolean
  inactivityNotificationsEnabled: boolean
  inactivityThresholdDays: number
}

export type UpdateSettingsInput = Partial<Omit<AppSettings, 'id'>>

export type NotificationItem = {
  id: number
  eventKey: string
  type: string
  title: string
  message: string
  href: string
  createdAt: string
  readAt: string | null
}

export type NotificationsResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}

export type CreateFocusSessionInput = {
  activityDate: string
  activityName: string
  startTime: string
  endTime: string
  note?: string
}

export type WeeklyGoalProgress = {
  weekStart: string
  targetMinutes: number
  trackedMinutes: number
  remainingMinutes: number
  progressPercent: number
}

export type FocusSessionRow = {
  activityDate: string
  activityName: string
  color: string
  durationMinutes: number
  startedAt: string | null
  endedAt: string | null
  note: string | null
}

export type DailyNoteRow = {
  activityDate: string
  note: string
}

export type WeeklyGoalRow = {
  weekStart: string
  targetMinutes: number
}

export type SessionsResponse = {
  year: number
  sessions: FocusSessionRow[]
  notes: DailyNoteRow[]
}

export async function fetchDashboard(year: number): Promise<DayData> {
  const response = await fetch(`/api/dashboard?year=${year}`)

  if (!response.ok) {
    throw new Error('Unable to load activity data.')
  }

  const data = (await response.json()) as DashboardResponse
  return data.records
}

export async function fetchAvailableYears(): Promise<number[]> {
  const response = await fetch('/api/years')

  if (!response.ok) {
    throw new Error('Unable to load available years.')
  }

  const data = (await response.json()) as { years: number[] }
  return data.years
}

export async function fetchActivities(): Promise<ActivityOption[]> {
  const response = await fetch('/api/activities')

  if (!response.ok) {
    throw new Error('Unable to load activities.')
  }

  return (await response.json()) as ActivityOption[]
}

export async function updateActivity(id: number, input: UpdateActivityInput) {
  const response = await fetch(`/api/activities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Unable to update activity.')
  }

  return (await response.json()) as ActivityOption
}

export async function fetchSettings(): Promise<AppSettings> {
  const response = await fetch('/api/settings')

  if (!response.ok) {
    throw new Error('Unable to load settings.')
  }

  return (await response.json()) as AppSettings
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  const response = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Unable to save settings.')
  }

  return (await response.json()) as AppSettings
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications')

  if (!response.ok) {
    throw new Error('Unable to load notifications.')
  }

  return (await response.json()) as NotificationsResponse
}

export async function markNotificationRead(id: number) {
  const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })

  if (!response.ok) {
    throw new Error('Unable to mark notification as read.')
  }
}

export async function markAllNotificationsRead() {
  const response = await fetch('/api/notifications/read-all', { method: 'POST' })

  if (!response.ok) {
    throw new Error('Unable to mark notifications as read.')
  }
}

export async function createFocusSession(input: CreateFocusSessionInput) {
  const response = await fetch('/api/focus-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Unable to save activity.')
  }
}

export async function fetchSessions(year: number): Promise<SessionsResponse> {
  const response = await fetch(`/api/sessions?year=${year}`)

  if (!response.ok) {
    throw new Error('Unable to load session data.')
  }

  return (await response.json()) as SessionsResponse
}

export async function fetchWeeklyGoals(year: number): Promise<WeeklyGoalRow[]> {
  const response = await fetch(`/api/weekly-goals?year=${year}`)

  if (!response.ok) {
    throw new Error('Unable to load weekly goals.')
  }

  const data = (await response.json()) as { year: number; goals: WeeklyGoalRow[] }
  return data.goals
}

export async function fetchWeeklyGoal(date: string): Promise<WeeklyGoalProgress> {
  const response = await fetch(`/api/weekly-goal?date=${date}`)

  if (!response.ok) {
    throw new Error('Unable to load weekly goal.')
  }

  return (await response.json()) as WeeklyGoalProgress
}

export async function updateWeeklyGoal(
  date: string,
  targetMinutes: number,
): Promise<WeeklyGoalProgress> {
  const response = await fetch('/api/weekly-goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, targetMinutes }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Unable to save weekly goal.')
  }

  return (await response.json()) as WeeklyGoalProgress
}
