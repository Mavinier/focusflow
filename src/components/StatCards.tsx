import { ArrowUpRight, CalendarDays, Target, Timer } from 'lucide-react'
import type { FocusMixItem } from '../utils/analytics'
import { formatDuration } from '../utils/tracker'

type StatCardsProps = {
  totalTrackedMinutes: number
  activeDaysCount: number
  topFocus?: FocusMixItem
}

function StatCards({ totalTrackedMinutes, activeDaysCount, topFocus }: StatCardsProps) {
  return (
    <section className="stat-grid" aria-label="Activity summary">
      <article className="stat-card">
        <div className="stat-icon lime"><Timer size={18} /></div>
        <div>
          <span className="stat-label">Time tracked</span>
          <strong>{Math.floor(totalTrackedMinutes / 60)}h {totalTrackedMinutes % 60}m</strong>
          <small><ArrowUpRight size={13} /> 18% from last period</small>
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-icon violet"><CalendarDays size={18} /></div>
        <div>
          <span className="stat-label">Active days</span>
          <strong>{activeDaysCount} <em>/ 303</em></strong>
          <small>Across your year so far</small>
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-icon peach"><Target size={18} /></div>
        <div>
          <span className="stat-label">Top focus</span>
          <strong>{topFocus?.name ?? '—'}</strong>
          <small>{topFocus ? `${formatDuration(topFocus.durationMinutes)} this year` : 'No activity yet'}</small>
        </div>
      </article>
    </section>
  )
}

export default StatCards
