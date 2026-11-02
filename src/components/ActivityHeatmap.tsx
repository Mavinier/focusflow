import { ChevronDown, LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { WEEKDAY_LABELS } from '../data/activityData'
import type { DayData } from '../types/tracker'
import {
  addDays,
  formatDuration,
  formatShortDate,
  getActivityMapRange,
  getIntensity,
  getTodayDateKey,
  toDateKey,
} from '../utils/tracker'

type ActivityHeatmapProps = {
  availableYears: number[]
  dayData: DayData
  onModeChange: (useRolling: boolean) => void
  onYearChange: (year: number) => void
  year: number
  selectedDate: string
  activeDaysCount: number
  onSelectDate: (date: string) => void
  useRollingWindow: boolean
}

function ActivityHeatmap({
  availableYears,
  dayData,
  onModeChange,
  onYearChange,
  year,
  selectedDate,
  activeDaysCount,
  onSelectDate,
  useRollingWindow,
}: ActivityHeatmapProps) {
  const today = getTodayDateKey()
  const mapRange = getActivityMapRange(year, today, useRollingWindow)
  const heatmapDays = useMemo(
    () => {
      const rangeStart = new Date(`${mapRange.from}T12:00:00`)
      const rangeEnd = new Date(`${mapRange.to}T12:00:00`)
      const heatmapStart = addDays(rangeStart, -rangeStart.getDay())
      const heatmapEnd = addDays(rangeEnd, 6 - rangeEnd.getDay())
      const days: Date[] = []

      for (let date = heatmapStart; date <= heatmapEnd; date = addDays(date, 1)) {
        days.push(date)
      }

      return days
    },
    [mapRange.from, mapRange.to],
  )
  const weeks = useMemo(
    () =>
      Array.from({ length: Math.ceil(heatmapDays.length / 7) }, (_, weekIndex) =>
        heatmapDays.slice(weekIndex * 7, weekIndex * 7 + 7),
      ),
    [heatmapDays],
  )
  const monthLabels = useMemo(
    () => {
      let previousMonth = ''

      return weeks.map((week) => {
        const firstVisibleDay = week.find((date) => {
          const dateKey = toDateKey(date)
          return dateKey >= mapRange.from && dateKey <= mapRange.to
        })

        if (!firstVisibleDay) return ''

        const monthKey = `${firstVisibleDay.getFullYear()}-${firstVisibleDay.getMonth()}`
        const isNewMonth = monthKey !== previousMonth
        previousMonth = monthKey

        return isNewMonth
          ? firstVisibleDay.toLocaleString('en-US', { month: 'short' })
          : ''
      })
    },
    [mapRange.from, mapRange.to, weeks],
  )

  return (
    <article className="card heatmap-card">
      <div className="card-heading">
        <div>
          <div className="title-with-icon">
            <span className="heading-icon"><LayoutGrid size={16} /></span>
            <h2>Activity map</h2>
          </div>
          <p>
            {useRollingWindow
              ? 'Last 365 days, ending today.'
              : `Full calendar year ${year}.`}
          </p>
        </div>
        <div className="heatmap-controls">
          {year === Number(today.slice(0, 4)) && (
            <button
              className="period-button"
              type="button"
              onClick={() => onModeChange(!useRollingWindow)}
            >
              {useRollingWindow ? `View ${year}` : 'Last 365 days'}
            </button>
          )}
          <label className="period-button year-selector">
            <select
              aria-label="Select heatmap year"
              className="year-select"
              value={year}
              onChange={(event) => onYearChange(Number(event.target.value))}
            >
              {availableYears.map((availableYear) => (
                <option key={availableYear} value={availableYear}>
                  {availableYear}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap">
          <div className="weekday-labels" aria-hidden="true">
            <span />
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div
            className="heatmap-chart"
            style={{ '--heatmap-week-count': weeks.length } as CSSProperties}
          >
            <div className="month-labels" aria-hidden="true">
              {monthLabels.map((label, index) => (
                <span key={`${label}-${index}`} style={{ gridColumn: index + 1 }}>
                  {label}
                </span>
              ))}
            </div>
            <div className="week-grid" role="grid" aria-label="Activity by day">
              {weeks.map((week, weekIndex) => (
                <div className="week-column" key={weekIndex} role="row">
                  {week.map((date) => {
                    const dateKey = toDateKey(date)
                    const record = dayData[dateKey]
                    const totalMinutes = record?.totalMinutes ?? 0
                    const isOutsideRange = dateKey < mapRange.from || dateKey > mapRange.to
                    const isSelected = dateKey === selectedDate
                    const intensity = isOutsideRange ? 'none' : getIntensity(totalMinutes)

                    return (
                      <button
                        className={`activity-cell intensity-${intensity}${isSelected ? ' selected' : ''}${isOutsideRange ? ' outside-range' : ''}`}
                        key={dateKey}
                        type="button"
                        role="gridcell"
                        disabled={isOutsideRange}
                        aria-label={`${formatShortDate(dateKey)}: ${totalMinutes ? `${formatDuration(totalMinutes)} focused` : 'No activity'}`}
                        aria-pressed={isSelected}
                        onClick={() => onSelectDate(dateKey)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="heatmap-footer">
        <span>{activeDaysCount} active days</span>
        <div className="legend">
          <span>Less</span>
          <i className="intensity-none" />
          <i className="intensity-low" />
          <i className="intensity-medium" />
          <i className="intensity-high" />
          <i className="intensity-very-high" />
          <span>More</span>
        </div>
      </div>
    </article>
  )
}

export default ActivityHeatmap
