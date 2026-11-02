import type {
  DailyNoteRow,
  FocusSessionRow,
} from '../types/analytics'
import type { DayData } from '../types/tracker'
import {
  buildFocusMix,
  calculateActiveStreak,
  calculateLongestStreak,
  type FocusMixItem,
} from './analytics'
import {
  DEFAULT_WEEKLY_TARGET_MINUTES,
  goalCompletionRate,
  plannedVsActual,
  type WeekPlanActual,
} from './goals'
import {
  addDays,
  countDaysInclusive,
  enumerateDates,
  formatShortDate,
  getLastDayOfMonth,
  getWeekEnd,
  getWeekStart,
  parseDateKey,
  toDateKey,
} from './tracker'

export type InsightPeriod = 'week' | 'month' | 'year'

export type TrendPoint = {
  key: string
  label: string
  minutes: number
  detail?: string
  tooltipTitle?: string
}

export type RankedDay = {
  date: string
  label: string
  minutes: number
}

export type HourBucket = {
  hour: number
  label: string
  axisLabel: string
  minutes: number
}

export type WeekdayTotal = {
  weekday: number
  label: string
  minutes: number
  sampleDays?: number
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
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function getPeriodRange(period: InsightPeriod, today: string) {
  if (period === 'week') {
    return { from: getWeekStart(today), to: today }
  }

  if (period === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }

  return { from: `${today.slice(0, 4)}-01-01`, to: today }
}

export function sliceSessions(
  sessions: FocusSessionRow[],
  from: string,
  to: string,
) {
  return sessions.filter(
    (session) => session.activityDate >= from && session.activityDate <= to,
  )
}

export { countDaysInclusive as countDaysInRange }

export function sessionsToDayData(
  sessions: FocusSessionRow[],
  notes: DailyNoteRow[] = [],
): DayData {
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
    const existing = record.activities.find(
      (activity) => activity.name === session.activityName,
    )

    if (existing) {
      existing.duration += session.durationMinutes
    } else {
      record.activities.push({
        name: session.activityName,
        duration: session.durationMinutes,
        color: session.color,
        icon: session.icon ?? 'notes',
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
    totals.set(
      session.activityDate,
      (totals.get(session.activityDate) ?? 0) + session.durationMinutes,
    )
  }

  if (period === 'week') {
    const weekStart = getWeekStart(today)
    return enumerateDates(weekStart, getWeekEnd(weekStart)).map((date) => ({
      key: date,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
        parseDateKey(date),
      ),
      minutes: date <= today ? (totals.get(date) ?? 0) : 0,
      detail: formatShortDate(date),
    }))
  }

  if (period === 'month') {
    const monthStart = `${today.slice(0, 7)}-01`
    const monthEnd = getLastDayOfMonth(today)
    const points: TrendPoint[] = []
    let cursor = getWeekStart(monthStart)

    while (cursor <= monthEnd) {
      const weekEnd = getWeekEnd(cursor)
      const rangeStart = cursor < monthStart ? monthStart : cursor
      const rangeEnd = weekEnd < monthEnd ? weekEnd : monthEnd
      const minutes = enumerateDates(rangeStart, rangeEnd)
        .filter((date) => date <= today)
        .reduce((total, date) => total + (totals.get(date) ?? 0), 0)

      points.push({
        key: cursor,
        label: formatShortDate(rangeStart).replace(/, \d{4}$/, ''),
        minutes,
        tooltipTitle: `${formatShortDate(rangeStart).replace(/, \d{4}$/, '')} – ${formatShortDate(rangeEnd).replace(/, \d{4}$/, '')}`,
      })
      cursor = toDateKey(addDays(parseDateKey(cursor), 7))
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
      label: MONTH_LABELS[index] ?? '',
      minutes,
    }
  })
}

export function topDays(
  sessions: FocusSessionRow[],
  limit = 5,
): RankedDay[] {
  const totals = new Map<string, number>()

  for (const session of sessions) {
    totals.set(
      session.activityDate,
      (totals.get(session.activityDate) ?? 0) + session.durationMinutes,
    )
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
      axisLabel: formatCompactHour(hour),
      minutes: buckets.get(hour) ?? 0,
    }
  })
}

export function weekdayDistribution(
  sessions: FocusSessionRow[],
): WeekdayTotal[] {
  const totals = Array.from({ length: 7 }, () => 0)

  for (const session of sessions) {
    const weekday = getWeekdayIndex(session.activityDate)
    totals[weekday] = (totals[weekday] ?? 0) + session.durationMinutes
  }

  return WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    minutes: totals[weekday] ?? 0,
  }))
}

export function weekdayBaseline(
  sessions: FocusSessionRow[],
  from: string,
  to: string,
): WeekdayTotal[] {
  const totals = Array.from({ length: 7 }, () => 0)
  const dayCounts = Array.from({ length: 7 }, () => 0)

  for (const date of enumerateDates(from, to)) {
    const weekday = getWeekdayIndex(date)
    dayCounts[weekday] = (dayCounts[weekday] ?? 0) + 1
  }

  for (const session of sessions) {
    if (session.activityDate < from || session.activityDate > to) continue
    const weekday = getWeekdayIndex(session.activityDate)
    totals[weekday] = (totals[weekday] ?? 0) + session.durationMinutes
  }

  return WEEKDAY_LABELS.map((label, weekday) => {
    const sampleDays = dayCounts[weekday] ?? 0
    return {
      weekday,
      label,
      minutes: sampleDays
        ? Math.round((totals[weekday] ?? 0) / sampleDays)
        : 0,
      sampleDays,
    }
  })
}

export function neglectedAreas(
  yearSessions: FocusSessionRow[],
  periodSessions: FocusSessionRow[],
  limit = 4,
): NeglectedArea[] {
  const yearTotals = new Map<string, { color: string; minutes: number }>()
  const periodTotals = new Map<string, number>()

  for (const session of yearSessions) {
    const current = yearTotals.get(session.activityName) ?? {
      color: session.color,
      minutes: 0,
    }
    current.minutes += session.durationMinutes
    yearTotals.set(session.activityName, current)
  }

  for (const session of periodSessions) {
    periodTotals.set(
      session.activityName,
      (periodTotals.get(session.activityName) ?? 0) + session.durationMinutes,
    )
  }

  return Array.from(yearTotals.entries())
    .map(([name, activity]) => ({
      name,
      color: activity.color,
      periodMinutes: periodTotals.get(name) ?? 0,
      yearMinutes: activity.minutes,
    }))
    .sort(
      (first, second) =>
        first.periodMinutes - second.periodMinutes ||
        second.yearMinutes - first.yearMinutes,
    )
    .slice(0, limit)
}

export function longestSessions(
  sessions: FocusSessionRow[],
  limit = 5,
): LongSession[] {
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

export function recentNotes(
  notes: DailyNoteRow[],
  sessions: FocusSessionRow[],
  limit = 6,
): InsightNote[] {
  const collected: InsightNote[] = notes
    .filter((note) => note.note.trim())
    .map((note) => ({
      date: note.activityDate,
      note: note.note.trim(),
      source: 'day' as const,
    }))

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
      detail: longestStreak
        ? `${longestStreak} consecutive active days`
        : 'No streak recorded yet',
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

function getWeekdayIndex(dateKey: string) {
  const day = parseDateKey(dateKey).getDay()
  return day === 0 ? 6 : day - 1
}

function parseStartHour(startedAt: string | null) {
  if (!startedAt) return null
  const match = startedAt.match(/T(\d{2})/)
  if (match?.[1]) return Number(match[1])

  const parsed = new Date(startedAt)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getHours()
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'pm' : 'am'
  const normalized = hour % 12 || 12
  return `${normalized}${suffix}`
}

function formatCompactHour(hour: number) {
  const suffix = hour >= 12 ? 'p' : 'a'
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

export {
  DEFAULT_WEEKLY_TARGET_MINUTES,
  goalCompletionRate,
  plannedVsActual,
  calculateLongestStreak,
}
export type { WeekPlanActual }
