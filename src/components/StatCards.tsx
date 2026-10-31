import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Minus,
  Target,
  Timer,
} from 'lucide-react'
import type { FocusMixItem } from '../utils/analytics'
import { formatDuration } from '../utils/tracker'

type StatCardsProps = {
  comparisonPercent: number | null
  periodDayCount: number
  year: number
  totalTrackedMinutes: number
  activeDaysCount: number
  topFocus?: FocusMixItem
}

function StatCards({
  comparisonPercent,
  periodDayCount,
  year,
  totalTrackedMinutes,
  activeDaysCount,
  topFocus,
}: StatCardsProps) {
  const ComparisonIcon =
    comparisonPercent === null
      ? Minus
      : comparisonPercent >= 0
        ? ArrowUpRight
        : ArrowDownRight
  const comparisonText =
    comparisonPercent === null
      ? 'No prior-period data'
      : `${comparisonPercent > 0 ? '+' : ''}${comparisonPercent}% vs same period last year`

  return (
    <section className="stat-grid" aria-label="Activity summary">
      <article className="stat-card">
        <div className="stat-icon lime"><Timer size={18} /></div>
        <div>
          <span className="stat-label">Time tracked</span>
          <strong>{Math.floor(totalTrackedMinutes / 60)}h {totalTrackedMinutes % 60}m</strong>
          <small className={`stat-change${comparisonPercent !== null && comparisonPercent < 0 ? ' negative' : ''}`}>
            <ComparisonIcon size={13} />
            {comparisonText}
          </small>
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-icon violet"><CalendarDays size={18} /></div>
        <div>
          <span className="stat-label">Active days</span>
          <strong>{activeDaysCount} <em>/ {periodDayCount}</em></strong>
          <small>Across the selected year</small>
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-icon peach"><Target size={18} /></div>
        <div>
          <span className="stat-label">Top focus</span>
          <strong>{topFocus?.name ?? '—'}</strong>
          <small>{topFocus ? `${formatDuration(topFocus.durationMinutes)} in ${year}` : 'No activity yet'}</small>
        </div>
      </article>
    </section>
  )
}

export default StatCards
