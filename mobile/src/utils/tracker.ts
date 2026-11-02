import type { Intensity } from '../types/tracker'

const DAY_IN_MS = 86_400_000

/**
 * Parse a date-only value at local noon. Using local components avoids a
 * midnight UTC conversion changing the calendar day on a phone.
 */
export function parseDateKey(dateKey: string) {
  return new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
    12,
  )
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateKey(date = new Date()) {
  return toDateKey(date)
}

export function getYearReferenceDate(year: number, today = getTodayDateKey()) {
  return year === Number(today.slice(0, 4)) ? today : `${year}-12-31`
}

export function getActivityMapRange(
  year: number,
  today = getTodayDateKey(),
  useRollingWindow = true,
) {
  if (useRollingWindow && year === Number(today.slice(0, 4))) {
    const rollingStart = toDateKey(addDays(parseDateKey(today), -364))
    return { from: rollingStart, to: today }
  }

  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export function getPreviousYearReferenceDate(year: number, today = getTodayDateKey()) {
  const referenceDate = getYearReferenceDate(year, today)
  return `${year - 1}${referenceDate.slice(4)}`
}

export function countDaysInclusive(from: string, to: string) {
  const start = parseDateKey(from)
  const end = parseDateKey(to)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1)
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function enumerateDates(from: string, to: string) {
  const dates: string[] = []
  let cursor = from

  while (cursor <= to) {
    dates.push(cursor)
    cursor = toDateKey(addDays(parseDateKey(cursor), 1))
  }

  return dates
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateKey(dateKey))
}

export function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateKey(dateKey))
}

export function formatDuration(minutes: number) {
  if (minutes === 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes}m`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

export function getDurationMinutes(startTime: string, endTime: string) {
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) return null

  const [startHours = 0, startMinutes = 0] = startTime.split(':').map(Number)
  const [endHours = 0, endMinutes = 0] = endTime.split(':').map(Number)
  const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)

  return duration > 0 ? duration : null
}

export function getIntensity(totalMinutes: number): Intensity {
  if (totalMinutes <= 0) return 'none'
  if (totalMinutes < 90) return 'low'
  if (totalMinutes < 240) return 'medium'
  if (totalMinutes < 420) return 'high'
  return 'very-high'
}

export function getCategoryLabel(totalMinutes: number) {
  if (totalMinutes >= 420) return 'Very active'
  if (totalMinutes >= 240) return 'Active'
  if (totalMinutes >= 90) return 'Steady'
  if (totalMinutes > 0) return 'Light day'
  return 'No activity'
}

export function getWeekStart(dateKey: string) {
  const date = parseDateKey(dateKey)
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  return toDateKey(addDays(date, -daysFromMonday))
}

export function getWeekEnd(weekStart: string) {
  return toDateKey(addDays(parseDateKey(weekStart), 6))
}

export function getWeekdayIndex(dateKey: string) {
  const day = parseDateKey(dateKey).getDay()
  return day === 0 ? 6 : day - 1
}

export function getLastDayOfMonth(dateKey: string) {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  return toDateKey(new Date(year, month, 0, 12))
}
