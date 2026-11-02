import type { DayData, Intensity } from '../types/tracker'
import {
  addDays,
  getActivityMapRange,
  getIntensity,
  getTodayDateKey,
  parseDateKey,
  toDateKey,
} from './tracker'

export type HeatmapCell = {
  date: string
  totalMinutes: number
  intensity: Intensity
  isOutsideRange: boolean
}

export type HeatmapModel = {
  from: string
  to: string
  weeks: HeatmapCell[][]
  monthLabels: string[]
  activeDaysCount: number
}

/**
 * Build the complete calendar grid used by the native heatmap.
 *
 * The grid is padded to whole Sunday–Saturday columns so every week has the
 * same shape. Padded cells remain visible but are marked outside the selected
 * range and cannot be selected by a UI.
 */
export function buildHeatmap(
  dayData: DayData,
  year: number,
  today = getTodayDateKey(),
  useRollingWindow = true,
): HeatmapModel {
  const range = getActivityMapRange(year, today, useRollingWindow)
  const rangeStart = parseDateKey(range.from)
  const rangeEnd = parseDateKey(range.to)
  const gridStart = addDays(rangeStart, -rangeStart.getDay())
  const gridEnd = addDays(rangeEnd, 6 - rangeEnd.getDay())
  const cells: HeatmapCell[] = []

  for (
    let date = gridStart;
    toDateKey(date) <= toDateKey(gridEnd);
    date = addDays(date, 1)
  ) {
    const dateKey = toDateKey(date)
    const record = dayData[dateKey]
    const isOutsideRange = dateKey < range.from || dateKey > range.to

    cells.push({
      date: dateKey,
      totalMinutes: record?.totalMinutes ?? 0,
      intensity: isOutsideRange ? 'none' : getIntensity(record?.totalMinutes ?? 0),
      isOutsideRange,
    })
  }

  const weeks = Array.from(
    { length: Math.ceil(cells.length / 7) },
    (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7),
  )

  let previousMonth = ''
  const monthLabels = weeks.map((week) => {
    const firstVisibleDay = week.find(
      (cell) => cell.date >= range.from && cell.date <= range.to,
    )

    if (!firstVisibleDay) return ''

    const monthKey = firstVisibleDay.date.slice(0, 7)
    const isNewMonth = monthKey !== previousMonth
    previousMonth = monthKey

    return isNewMonth
      ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
          parseDateKey(firstVisibleDay.date),
        )
      : ''
  })

  const activeDaysCount = Object.values(dayData).filter(
    (record) =>
      record.date >= range.from &&
      record.date <= range.to &&
      record.totalMinutes > 0,
  ).length

  return {
    from: range.from,
    to: range.to,
    weeks,
    monthLabels,
    activeDaysCount,
  }
}
