import type { DailyNoteRow, FocusSessionRow, WeeklyGoalRow } from '../api/activityApi'
import type { DayData } from '../types/tracker'
import { buildFocusMix, calculateActiveStreak, type FocusMixItem } from './analytics'
import { addDays, formatShortDate, toDateKey } from './tracker'
import { DEFAULT_WEEKLY_TARGET_MINUTES, getWeekEnd, getWeekStart } from './week'

export type InsightPeriod = 'week' | 'month' | 'year'

export type TrendPoint = {
  key: string
  label: string
  minutes: number
}

export type RankedDay = {
  date: string
  label: string
  minutes: number
}

export type HourBucket = {
  hour: number
  label: string
  minutes: number
}

export type WeekdayTotal = {
  weekday: number
  label: string
  minutes: number
}

export type WeekPlanActual = {
  weekStart: string
  label: string
  targetMinutes: number
  actualMinutes: number
  met: boolean
}

export type NeglectedArea = {
  name: string
  color: string
  periodMinutes: number
  yearMinutes: number
}

export type LongSession = {
  activityDate: string
  activityName: string
  color: string
  durationMinutes: number
  startedAt: string | null
  note: string | null
}

export type InsightNote = {
  date: string
  note: string
  source: 'day' | 'session'
}

export type InsightHighlight = {
  title: string
  detail: string
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getPeriodRange(period: InsightPeriod, today: string) {
  if (period === 'week') {
    return { from: getWeekStart(today), to: today }
  }

  if (period === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }

  return { from: `${today.slice(0, 4)}-01-01`, to: today }
}

export function sliceSessions(sessions: FocusSessionRow[], from: string, to: string) {
  return sessions.filter((session) => session.activityDate >= from && session.activityDate <= to)
}

export function countDaysInRange(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
}

export function sessionsToDayData(sessions: FocusSessionRow[], notes: DailyNoteRow[] = []): DayData {
  const notesByDate = new Map(notes.map((note) => [note.activityDate, note.note]))
  const records: DayData = {}

  for (const session of sessions) {
    const record = records[session.activityDate] ?? {
      date: session.activityDate,
      totalMinutes: 0,
      note: notesByDate.get(session.activityDate) ?? '',
      activities: [],
    }

    record.totalMinutes += session.durationMinutes
    const existing = record.activities.find((activity) => activity.name === session.activityName)

    if (existing) {
      existing.duration += session.durationMinutes
    } else {
      record.activities.push({
        name: session.activityName,
        duration: session.durationMinutes,
        color: session.color,
        icon: 'notes',
      })
    }

    records[session.activityDate] = record
  }

  return records
}

export function totalMinutes(sessions: FocusSessionRow[]) {
  return sessions.reduce((total, session) => total + session.durationMinutes, 0)
}

export function buildTrend(
  sessions: FocusSessionRow[],
  period: InsightPeriod,
  today: string,
): TrendPoint[] {
  const totals = new Map<string, number>()

  for (const session of sessions) {
    totals.set(session.activityDate, (totals.get(session.activityDate) ?? 0) + session.durationMinutes)
  }

  if (period === 'week') {
    const weekStart = getWeekStart(today)
    return enumerateDates(weekStart, getWeekEnd(weekStart)).map((date) => ({
      key: date,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
      minutes: date <= today ? (totals.get(date) ?? 0) : 0,
    }))
  }

  if (period === 'month') {
    const monthStart = `${today.slice(0, 7)}-01`
    const monthEnd = lastDayOfMonth(today)
    const points: TrendPoint[] = []
    let cursor = getWeekStart(monthStart)

    while (cursor <= monthEnd) {
      const weekEnd = getWeekEnd(cursor)
      const rangeEnd = weekEnd < monthEnd ? weekEnd : monthEnd
      const minutes = enumerateDates(cursor < monthStart ? monthStart : cursor, rangeEnd)
        .filter((date) => date <= today)
        .reduce((total, date) => total + (totals.get(date) ?? 0), 0)

      points.push({
        key: cursor,
        label: formatShortDate(cursor).replace(/, \d{4}$/, ''),
        minutes,
      })
      cursor = toDateKey(addDays(new Date(`${cursor}T12:00:00`), 7))
    }

    return points
  }

  const year = today.slice(0, 4)
  const lastMonth = Number(today.slice(5, 7))

  return Array.from({ length: lastMonth }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')
    const prefix = `${year}-${month}`
    const minutes = Array.from(totals.entries())
      .filter(([date]) => date.startsWith(prefix) && date <= today)
      .reduce((total, [, value]) => total + value, 0)

    return {
      key: prefix,
      label: MONTH_LABELS[index],
      minutes,
    }
  })
}

export function topDays(sessions: FocusSessionRow[], limit = 5): RankedDay[] {
  const totals = new Map<string, number>()

  for (const session of sessions) {
    totals.set(session.activityDate, (totals.get(session.activityDate) ?? 0) + session.durationMinutes)
  }

  return Array.from(totals.entries())
    .sort(([, first], [, second]) => second - first)
    .slice(0, limit)
    .map(([date, minutes]) => ({
      date,
      label: formatShortDate(date),
      minutes,
    }))
}

export function hourHistogram(sessions: FocusSessionRow[]): HourBucket[] {
  const buckets = new Map<number, number>()

  for (const session of sessions) {
    const hour = parseStartHour(session.startedAt)
    if (hour === null) continue
    buckets.set(hour, (buckets.get(hour) ?? 0) + session.durationMinutes)
  }

  const hours = Array.from(buckets.keys())
  if (!hours.length) return []

  const start = Math.min(6, ...hours)
  const end = Math.max(21, ...hours)

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const hour = start + index
    return {
      hour,
      label: formatHour(hour),
      minutes: buckets.get(hour) ?? 0,
    }
  })
}

export function weekdayDistribution(sessions: FocusSessionRow[]): WeekdayTotal[] {
  const totals = Array.from({ length: 7 }, () => 0)

  for (const session of sessions) {
    const date = new Date(`${session.activityDate}T12:00:00`)
    const mondayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1
    totals[mondayIndex] += session.durationMinutes
  }

  return WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    minutes: totals[weekday],
  }))
}

export function plannedVsActual(
  sessions: FocusSessionRow[],
  goals: WeeklyGoalRow[],
  from: string,
  to: string,
): WeekPlanActual[] {
  const goalMap = new Map(goals.map((goal) => [goal.weekStart, goal.targetMinutes]))
  const firstWeek = getWeekStart(from)
  const points: WeekPlanActual[] = []
  let cursor = firstWeek

  while (cursor <= to) {
    const weekEnd = getWeekEnd(cursor)
    const actualMinutes = sessions
      .filter((session) => session.activityDate >= cursor && session.activityDate <= weekEnd && session.activityDate <= to)
      .reduce((total, session) => total + session.durationMinutes, 0)
    const targetMinutes = goalMap.get(cursor) ?? DEFAULT_WEEKLY_TARGET_MINUTES

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

export function calculateLongestStreak(dayData: DayData) {
  const dates = Object.values(dayData)
    .filter((record) => record.totalMinutes > 0)
    .map((record) => record.date)
    .sort()

  let longest = 0
  let current = 0
  let previous: string | null = null

  for (const date of dates) {
    if (previous && date === toDateKey(addDays(new Date(`${previous}T12:00:00`), 1))) {
      current += 1
    } else {
      current = 1
    }

    longest = Math.max(longest, current)
    previous = date
  }

  return longest
}

export function neglectedAreas(
  yearSessions: FocusSessionRow[],
  periodSessions: FocusSessionRow[],
  limit = 4,
): NeglectedArea[] {
  const yearTotals = new Map<string, { color: string; minutes: number }>()
  const periodTotals = new Map<string, number>()

  for (const session of yearSessions) {
    const current = yearTotals.get(session.activityName) ?? { color: session.color, minutes: 0 }
    current.minutes += session.durationMinutes
    yearTotals.set(session.activityName, current)
  }

  for (const session of periodSessions) {
    periodTotals.set(session.activityName, (periodTotals.get(session.activityName) ?? 0) + session.durationMinutes)
  }

  return Array.from(yearTotals.entries())
    .map(([name, activity]) => ({
      name,
      color: activity.color,
      periodMinutes: periodTotals.get(name) ?? 0,
      yearMinutes: activity.minutes,
    }))
    .sort((first, second) => first.periodMinutes - second.periodMinutes || second.yearMinutes - first.yearMinutes)
    .slice(0, limit)
}

export function longestSessions(sessions: FocusSessionRow[], limit = 5): LongSession[] {
  return [...sessions]
    .sort((first, second) => second.durationMinutes - first.durationMinutes)
    .slice(0, limit)
    .map((session) => ({
      activityDate: session.activityDate,
      activityName: session.activityName,
      color: session.color,
      durationMinutes: session.durationMinutes,
      startedAt: session.startedAt,
      note: session.note,
    }))
}

export function recentNotes(notes: DailyNoteRow[], sessions: FocusSessionRow[], limit = 6): InsightNote[] {
  const collected: InsightNote[] = notes
    .filter((note) => note.note.trim())
    .map((note) => ({ date: note.activityDate, note: note.note.trim(), source: 'day' as const }))

  for (const session of sessions) {
    if (!session.note?.trim()) continue
    collected.push({
      date: session.activityDate,
      note: session.note.trim(),
      source: 'session',
    })
  }

  const unique = new Map<string, InsightNote>()
  for (const item of collected) {
    unique.set(`${item.date}:${item.note}`, item)
  }

  return Array.from(unique.values())
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, limit)
}

export function buildHighlights(
  currentStreak: number,
  longestStreak: number,
  longest: LongSession | undefined,
  latestWeek: WeekPlanActual | undefined,
): InsightHighlight[] {
  const highlights: InsightHighlight[] = [
    {
      title: 'Longest streak',
      detail: longestStreak ? `${longestStreak} consecutive active days` : 'No streak recorded yet',
    },
  ]

  if (currentStreak > 0) {
    highlights.push({
      title: 'Current streak',
      detail: `${currentStreak} day${currentStreak === 1 ? '' : 's'} in a row`,
    })
  }

  if (longest) {
    highlights.push({
      title: 'Longest session',
      detail: `${longest.activityName} · ${formatShortDate(longest.activityDate)}`,
    })
  }

  if (latestWeek) {
    highlights.push({
      title: latestWeek.met ? 'Weekly goal hit' : 'Weekly goal in progress',
      detail: latestWeek.met
        ? `Reached the ${formatMinutes(latestWeek.targetMinutes)} target`
        : `${formatMinutes(latestWeek.actualMinutes)} of ${formatMinutes(latestWeek.targetMinutes)}`,
    })
  }

  return highlights.slice(0, 4)
}

export function mixFromSessions(sessions: FocusSessionRow[]): FocusMixItem[] {
  return buildFocusMix(sessionsToDayData(sessions))
}

export function streakFromSessions(sessions: FocusSessionRow[]) {
  return calculateActiveStreak(sessionsToDayData(sessions))
}

function enumerateDates(from: string, to: string) {
  const dates: string[] = []
  let cursor = from

  while (cursor <= to) {
    dates.push(cursor)
    cursor = toDateKey(addDays(new Date(`${cursor}T12:00:00`), 1))
  }

  return dates
}

function lastDayOfMonth(dateKey: string) {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  return toDateKey(new Date(year, month, 0, 12, 0, 0))
}

function parseStartHour(startedAt: string | null) {
  if (!startedAt) return null
  const match = startedAt.match(/T(\d{2})/)
  if (match) return Number(match[1])

  const parsed = new Date(startedAt)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getHours()
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'pm' : 'am'
  const normalized = hour % 12 || 12
  return `${normalized}${suffix}`
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (!hours) return `${remaining}m`
  if (!remaining) return `${hours}h`
  return `${hours}h ${remaining}m`
}
