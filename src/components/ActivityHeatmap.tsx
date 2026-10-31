import { ChevronDown, LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { WEEKDAY_LABELS } from '../data/activityData'
import type { DayData } from '../types/tracker'
import {
  addDays,
  formatDuration,
  formatShortDate,
  getIntensity,
  getTodayDateKey,
  toDateKey,
} from '../utils/tracker'

type ActivityHeatmapProps = {
  availableYears: number[]
  dayData: DayData
  onYearChange: (year: number) => void
  year: number
  selectedDate: string
  activeDaysCount: number
  onSelectDate: (date: string) => void
}

function ActivityHeatmap({
  availableYears,
  dayData,
  onYearChange,
  year,
  selectedDate,
  activeDaysCount,
  onSelectDate,
}: ActivityHeatmapProps) {
  const today = getTodayDateKey()
  const heatmapDays = useMemo(
    () => {
      const yearStart = new Date(`${year}-01-01T12:00:00`)
      const yearEnd = new Date(`${year}-12-31T12:00:00`)
      const heatmapStart = addDays(yearStart, -yearStart.getDay())
      const heatmapEnd = addDays(yearEnd, 6 - yearEnd.getDay())
      const days: Date[] = []

      for (let date = heatmapStart; date <= heatmapEnd; date = addDays(date, 1)) {
        days.push(date)
      }

      return days
    },
    [year],
  )
  const weeks = useMemo(
    () =>
      Array.from({ length: Math.ceil(heatmapDays.length / 7) }, (_, weekIndex) =>
        heatmapDays.slice(weekIndex * 7, weekIndex * 7 + 7),
      ),
    [heatmapDays],
  )
  const monthLabels = useMemo(
    () =>
      weeks.map((week, index) => {
        const firstDay = week[0]
        const month = firstDay.toLocaleString('en-US', { month: 'short' })
        const isNewMonth = index === 0 || firstDay.getDate() <= 7
        return isNewMonth ? month : ''
      }),
    [weeks],
  )

  return (
    <article className="card heatmap-card">
      <div className="card-heading">
        <div>
          <div className="title-with-icon">
            <span className="heading-icon"><LayoutGrid size={16} /></span>
            <h2>Activity map</h2>
          </div>
          <p>Every square is a moment you chose to move forward.</p>
        </div>
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
                    const isFuture = dateKey > today
                    const isOutsideYear = date.getFullYear() !== year
                    const isUnavailable = isOutsideYear || isFuture
                    const isSelected = dateKey === selectedDate
                    const intensity = isUnavailable ? 'none' : getIntensity(totalMinutes)

                    return (
                      <button
                        className={`activity-cell intensity-${intensity}${isSelected ? ' selected' : ''}${isOutsideYear ? ' outside-year' : ''}`}
                        key={dateKey}
                        type="button"
                        role="gridcell"
                        disabled={isUnavailable}
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
