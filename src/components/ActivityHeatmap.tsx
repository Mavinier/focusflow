import { ChevronDown, LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'
import {
  DAYS_IN_HEATMAP,
  HEATMAP_START,
  LAST_TRACKED_DATE,
  TRACKING_YEAR,
  WEEKDAY_LABELS,
} from '../data/activityData'
import type { DayData } from '../types/tracker'
import {
  addDays,
  formatDuration,
  formatShortDate,
  getIntensity,
  toDateKey,
} from '../utils/tracker'

type ActivityHeatmapProps = {
  dayData: DayData
  selectedDate: string
  activeDaysCount: number
  onSelectDate: (date: string) => void
}

function ActivityHeatmap({
  dayData,
  selectedDate,
  activeDaysCount,
  onSelectDate,
}: ActivityHeatmapProps) {
  const heatmapDays = useMemo(
    () => Array.from({ length: DAYS_IN_HEATMAP }, (_, index) => addDays(HEATMAP_START, index)),
    [],
  )
  const weeks = useMemo(
    () =>
      Array.from({ length: 53 }, (_, weekIndex) =>
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
        <button className="period-button" type="button">
          This year
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap">
          <div className="weekday-labels" aria-hidden="true">
            <span />
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="heatmap-chart">
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
                    const isFuture = dateKey > LAST_TRACKED_DATE
                    const isOutsideYear = date.getFullYear() !== TRACKING_YEAR
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
