import type { FocusSessionRow, WeeklyGoalRow } from '../types/analytics'
import {
  addDays,
  formatShortDate,
  getWeekEnd,
  getWeekStart,
  toDateKey,
} from './tracker'

export const DEFAULT_WEEKLY_TARGET_MINUTES = 10 * 60

export type WeekPlanActual = {
  weekStart: string
  label: string
  targetMinutes: number
  actualMinutes: number
  met: boolean
}

export type WeeklyGoalProgress = {
  weekStart: string
  targetMinutes: number
  trackedMinutes: number
  remainingMinutes: number
  progressPercent: number
}

export function plannedVsActual(
  sessions: FocusSessionRow[],
  goals: WeeklyGoalRow[],
  from: string,
  to: string,
  defaultTargetMinutes = DEFAULT_WEEKLY_TARGET_MINUTES,
): WeekPlanActual[] {
  const goalMap = new Map(goals.map((goal) => [goal.weekStart, goal.targetMinutes]))
  const firstWeek = getWeekStart(from)
  const points: WeekPlanActual[] = []
  let cursor = firstWeek

  while (cursor <= to) {
    const weekEnd = getWeekEnd(cursor)
    const actualMinutes = sessions
      .filter(
        (session) =>
          session.activityDate >= cursor &&
          session.activityDate <= weekEnd &&
          session.activityDate <= to,
      )
      .reduce((total, session) => total + session.durationMinutes, 0)
    const targetMinutes = goalMap.get(cursor) ?? defaultTargetMinutes

    points.push({
      weekStart: cursor,
      label: formatShortDate(cursor).replace(/, \d{4}$/, ''),
      targetMinutes,
      actualMinutes,
      met: actualMinutes >= targetMinutes,
    })

    cursor = toDateKey(addDays(new Date(`${cursor}T12:00:00`), 7))
  }

  return points
}

export function goalCompletionRate(weeks: WeekPlanActual[]) {
  if (!weeks.length) return 0
  const met = weeks.filter((week) => week.met).length
  return Math.round((met / weeks.length) * 1000) / 10
}

export function calculateWeeklyGoalProgress(
  date: string,
  sessions: FocusSessionRow[],
  targetMinutes: number,
): WeeklyGoalProgress {
  const weekStart = getWeekStart(date)
  const weekEnd = getWeekEnd(weekStart)
  const trackedMinutes = sessions
    .filter(
      (session) =>
        session.activityDate >= weekStart && session.activityDate <= weekEnd,
    )
    .reduce((total, session) => total + session.durationMinutes, 0)
  const remainingMinutes = targetMinutes - trackedMinutes

  return {
    weekStart,
    targetMinutes,
    trackedMinutes,
    remainingMinutes,
    progressPercent: targetMinutes
      ? Math.round((trackedMinutes / targetMinutes) * 1000) / 10
      : 0,
  }
}
