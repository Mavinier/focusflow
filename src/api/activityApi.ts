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

export async function fetchActivities(): Promise<ActivityOption[]> {
  const response = await fetch('/api/activities')

  if (!response.ok) {
    throw new Error('Unable to load activities.')
  }

  return (await response.json()) as ActivityOption[]
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
