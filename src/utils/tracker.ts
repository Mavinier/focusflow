import type { Intensity } from '../types/tracker'

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    const rollingStart = toDateKey(addDays(new Date(`${today}T12:00:00`), -364))
    return { from: rollingStart, to: today }
  }

  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export function getPreviousYearReferenceDate(year: number, today = getTodayDateKey()) {
  const referenceDate = getYearReferenceDate(year, today)
  return `${year - 1}${referenceDate.slice(4)}`
}

export function countDaysInclusive(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

export function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

export function formatDuration(minutes: number) {
  if (minutes === 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes}m`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

export function getIntensity(totalMinutes: number): Intensity {
  if (totalMinutes === 0) return 'none'
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
