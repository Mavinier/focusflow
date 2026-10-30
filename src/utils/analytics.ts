import type { DayData } from '../types/tracker'
import { addDays, toDateKey } from './tracker'

export type FocusMixItem = {
  name: string
  color: string
  durationMinutes: number
  activeDays: number
  percentage: number
}

export function calculateActiveStreak(dayData: DayData) {
  const latestActiveDate = Object.values(dayData)
    .filter((record) => record.totalMinutes > 0)
    .map((record) => record.date)
    .sort()

  if (!latestActiveDate.length) return 0
  const latestDate = latestActiveDate[latestActiveDate.length - 1]

  let streak = 0
  let date = new Date(`${latestDate}T12:00:00`)

  while (dayData[toDateKey(date)]?.totalMinutes > 0) {
    streak += 1
    date = addDays(date, -1)
  }

  return streak
}

export function buildFocusMix(dayData: DayData): FocusMixItem[] {
  const activityTotals = new Map<
    string,
    { color: string; durationMinutes: number; dates: Set<string> }
  >()

  for (const record of Object.values(dayData)) {
    for (const activity of record.activities) {
      const current = activityTotals.get(activity.name) ?? {
        color: activity.color,
        durationMinutes: 0,
        dates: new Set<string>(),
      }

      current.durationMinutes += activity.duration
      current.dates.add(record.date)
      activityTotals.set(activity.name, current)
    }
  }

  const totalMinutes = Array.from(activityTotals.values()).reduce(
    (total, activity) => total + activity.durationMinutes,
    0,
  )

  return Array.from(activityTotals.entries())
    .sort(([, first], [, second]) => second.durationMinutes - first.durationMinutes)
    .map(([name, activity]) => ({
      name,
      color: activity.color,
      durationMinutes: activity.durationMinutes,
      activeDays: activity.dates.size,
      percentage: totalMinutes
        ? Math.round((activity.durationMinutes / totalMinutes) * 1000) / 10
        : 0,
    }))
}
