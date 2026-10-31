import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FocusMixItem } from '../utils/analytics'
import { formatDuration } from '../utils/tracker'

type InsightCardsProps = {
  focusMix: FocusMixItem[]
  year: number
}

function InsightCards({ focusMix, year }: InsightCardsProps) {
  return (
    <section className="bottom-grid" id="insights">
      <article className="card quote-card">
        <div className="quote-mark">“</div>
        <div>
          <p className="eyebrow">A note for your future self</p>
          <blockquote>
            Consistency is a quiet superpower. Keep showing up for the things that matter.
          </blockquote>
          <span className="quote-date">Added to your focus journal · Oct 28</span>
        </div>
      </article>
      <article className="card focus-card">
        <div className="card-heading compact">
          <div>
            <div className="title-with-icon">
              <span className="heading-icon peach-icon"><Sparkles size={16} /></span>
              <h2>Focus mix</h2>
            </div>
            <p>Where your time went in {year}.</p>
          </div>
          <Link className="text-button" to="/insights">
            View insights <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="focus-mix" role="list" aria-label="Focus time by activity">
          {focusMix.length > 0 ? (
            focusMix.map((activity) => (
              <span
                className="focus-mix-segment"
                key={activity.name}
                role="listitem"
                tabIndex={0}
                aria-label={`${activity.name}: ${formatDuration(activity.durationMinutes)} across ${activity.activeDays} ${activity.activeDays === 1 ? 'day' : 'days'}, ${activity.percentage}% of focus time`}
                style={{ flex: activity.durationMinutes, backgroundColor: activity.color }}
              >
                <span className="focus-mix-tooltip" role="tooltip">
                  <strong>{activity.name}</strong>
                  <span>
                    {formatDuration(activity.durationMinutes)} · {activity.activeDays}{' '}
                    {activity.activeDays === 1 ? 'active day' : 'active days'}
                  </span>
                  <small>{activity.percentage}% of focus time</small>
                </span>
              </span>
            ))
          ) : (
            <span className="focus-mix-empty">No activity recorded yet</span>
          )}
        </div>
        <div className="focus-legend">
          {focusMix.map((activity) => (
            <span key={activity.name}>
              <i style={{ backgroundColor: activity.color }} />
              {activity.name}
              <strong>{activity.percentage}%</strong>
            </span>
          ))}
        </div>
      </article>
    </section>
  )
}

export default InsightCards
