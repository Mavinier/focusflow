export const DEFAULT_WEEKLY_TARGET_MINUTES = 10 * 60

export function getWeekStart(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  date.setDate(date.getDate() - daysFromMonday)
  return date.toISOString().slice(0, 10)
}

export function getWeekEnd(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + 6)
  return date.toISOString().slice(0, 10)
}
