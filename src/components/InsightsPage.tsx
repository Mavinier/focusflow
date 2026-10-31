import { Flame, Ruler } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  fetchSessions,
  fetchWeeklyGoals,
  type DailyNoteRow,
  type FocusSessionRow,
  type WeeklyGoalRow,
} from '../api/activityApi'
import type { AppOutletContext } from '../types/app'
import {
  buildHighlights,
  buildTrend,
  calculateLongestStreak,
  countDaysInRange,
  getPeriodRange,
  goalCompletionRate,
  hourHistogram,
  longestSessions,
  mixFromSessions,
  neglectedAreas,
  plannedVsActual,
  recentNotes,
  sessionsToDayData,
  sliceSessions,
  streakFromSessions,
  topDays,
  totalMinutes,
  weekdayBaseline,
  weekdayDistribution,
  type InsightPeriod,
} from '../utils/insights'
import {
  formatDuration,
  formatShortDate,
  getTodayDateKey,
  getYearReferenceDate,
} from '../utils/tracker'

const PERIODS: { id: InsightPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

function InsightsPage() {
  const { currentStreak, dataVersion, selectedYear } = useOutletContext<AppOutletContext>()
  const today = getTodayDateKey()
  const referenceDate = getYearReferenceDate(selectedYear, today)
  const [period, setPeriod] = useState<InsightPeriod>('year')
  const [showChartScale, setShowChartScale] = useState(true)
  const [sessions, setSessions] = useState<FocusSessionRow[]>([])
  const [notes, setNotes] = useState<DailyNoteRow[]>([])
  const [goals, setGoals] = useState<WeeklyGoalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([fetchSessions(selectedYear), fetchWeeklyGoals(selectedYear)])
      .then(([sessionData, weeklyGoals]) => {
        if (cancelled) return
        setSessions(sessionData.sessions)
        setNotes(sessionData.notes)
        setGoals(weeklyGoals)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load insights.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataVersion, selectedYear])

  const range = useMemo(() => getPeriodRange(period, referenceDate), [period, referenceDate])
  const periodSessions = useMemo(
    () => sliceSessions(sessions, range.from, range.to),
    [sessions, range],
  )
  const mix = useMemo(() => mixFromSessions(periodSessions), [periodSessions])
  const trend = useMemo(
    () => buildTrend(periodSessions, period, referenceDate),
    [periodSessions, period, referenceDate],
  )
  const productiveDays = useMemo(() => topDays(periodSessions), [periodSessions])
  const hours = useMemo(() => hourHistogram(periodSessions), [periodSessions])
  const weekdays = useMemo(
    () => period === 'week'
      ? weekdayBaseline(sessions, `${selectedYear}-01-01`, referenceDate)
      : weekdayDistribution(periodSessions),
    [period, periodSessions, referenceDate, selectedYear, sessions],
  )
  const weeks = useMemo(
    () => plannedVsActual(periodSessions, goals, range.from, range.to),
    [periodSessions, goals, range],
  )
  const completion = goalCompletionRate(weeks)
  const yearDayData = useMemo(() => sessionsToDayData(sessions, notes), [sessions, notes])
  const longestStreak = useMemo(() => calculateLongestStreak(yearDayData), [yearDayData])
  const periodStreak = useMemo(() => streakFromSessions(periodSessions), [periodSessions])
  const neglected = useMemo(
    () => neglectedAreas(sessions, periodSessions),
    [sessions, periodSessions],
  )
  const longSessions = useMemo(() => longestSessions(periodSessions), [periodSessions])
  const notesList = useMemo(
    () => recentNotes(
      notes.filter((note) => note.activityDate >= range.from && note.activityDate <= range.to),
      periodSessions,
      5,
    ),
    [notes, periodSessions, range],
  )
  const highlights = useMemo(
    () => buildHighlights(currentStreak || periodStreak, longestStreak, longSessions[0], weeks[weeks.length - 1]),
    [currentStreak, periodStreak, longestStreak, longSessions, weeks],
  )
  const trackedMinutes = totalMinutes(periodSessions)
  const activeDaysCount = new Set(periodSessions.map((session) => session.activityDate)).size
  const dayCount = countDaysInRange(range.from, range.to)
  const activeRatio = Math.round((activeDaysCount / dayCount) * 1000) / 10
  const maxTrend = Math.max(...trend.map((point) => point.minutes), 1)
  const maxHour = Math.max(...hours.map((bucket) => bucket.minutes), 1)
  const maxWeekday = Math.max(...weekdays.map((day) => day.minutes), 1)
  const maxPlan = Math.max(...weeks.map((week) => Math.max(week.actualMinutes, week.targetMinutes)), 1)

  return (
    <div className="page-content">
      <section className="intro">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Where your attention actually went.</h1>
          <p className="intro-copy">
            Trends, mix, and consistency derived from your tracked sessions.
          </p>
          <div className="period-toggle" role="group" aria-label="Insights period">
            {PERIODS.map((option) => (
              <button
                key={option.id}
                className={`period-button${period === option.id ? ' active' : ''}`}
                type="button"
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
            <button
              aria-pressed={showChartScale}
              className={`period-button scale-toggle${showChartScale ? ' active' : ''}`}
              type="button"
              onClick={() => setShowChartScale((visible) => !visible)}
            >
              <Ruler size={13} />
              Scale
            </button>
          </div>
          {isLoading && <p className="data-status">Loading insights…</p>}
          {error && <p className="data-status error">{error} Start the API with <code>npm run dev</code>.</p>}
        </div>
        <div className="streak-pill">
          <Flame size={16} />
          <span><strong>{currentStreak || periodStreak}</strong> day streak</span>
        </div>
      </section>

      <section className="stat-grid insight-summary" aria-label="Insights summary">
        <article className="stat-card">
          <div>
            <span className="stat-label">Time in period</span>
            <strong>{formatDuration(trackedMinutes)}</strong>
            <small>{formatShortDate(range.from)} – {formatShortDate(range.to)}</small>
          </div>
        </article>
        <article className="stat-card">
          <div>
            <span className="stat-label">Active days</span>
            <strong>{activeDaysCount} <em>/ {dayCount}</em></strong>
            <small>{activeRatio}% of days had focus time</small>
          </div>
        </article>
        <article className="stat-card">
          <div>
            <span className="stat-label">Top activity</span>
            <strong>{mix[0]?.name ?? '—'}</strong>
            <small>{mix[0] ? formatDuration(mix[0].durationMinutes) : 'No activity yet'}</small>
          </div>
        </article>
        <article className="stat-card">
          <div>
            <span className="stat-label">Goal completion</span>
            <strong>{completion}%</strong>
            <small>{weeks.filter((week) => week.met).length} of {weeks.length} weeks met target</small>
          </div>
        </article>
      </section>

      {!isLoading && periodSessions.length === 0 && !error && (
        <p className="data-status">No sessions in this period yet.</p>
      )}

      <section className="insight-grid">
        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Focus mix</p>
              <h2>Time by activity</h2>
            </div>
          </div>
          <BarList
            empty="No activity recorded yet"
            scrollable
            items={mix.map((activity) => ({
              key: activity.name,
              label: activity.name,
              value: formatDuration(activity.durationMinutes),
              minutes: activity.durationMinutes,
              color: activity.color,
              hint: `${activity.percentage}%`,
            }))}
          />
        </article>

        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Trends</p>
              <h2>{period === 'week' ? 'Daily' : period === 'month' ? 'Weekly' : 'Monthly'} focus</h2>
              <p className="chart-context">
                {period === 'week'
                  ? `Daily totals for ${formatShortDate(range.from)} – ${formatShortDate(range.to)} · all activities`
                  : `Total focus in the selected ${period} · all activities`}
              </p>
            </div>
          </div>
          <ChartArea ariaLabel="Focus trend" max={maxTrend} showScale={showChartScale}>
            {trend.map((point) => (
              <div
                className="insight-column"
                key={point.key}
                tabIndex={0}
                aria-label={`${point.tooltipTitle ?? point.label}${point.detail ? `, ${point.detail}` : ''}: ${formatDuration(point.minutes)} focused`}
              >
                <div className="insight-bar-slot">
                  <span
                    className="insight-column-bar"
                    style={{ height: `${Math.max((point.minutes / maxTrend) * 100, point.minutes ? 4 : 0)}%` }}
                    title={`${point.tooltipTitle ?? point.label}${point.detail ? `, ${point.detail}` : ''}: ${formatDuration(point.minutes)}`}
                  />
                  <span className="chart-tooltip" role="tooltip">
                    <strong>{point.tooltipTitle ?? point.label}</strong>
                    <small>
                      {point.detail ? `${point.detail} · ` : ''}
                      {formatDuration(point.minutes)} focused
                    </small>
                  </span>
                </div>
                <span>{point.label}</span>
              </div>
            ))}
          </ChartArea>
        </article>
      </section>

      <section className="insight-grid">
        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Peaks</p>
              <h2>Most productive days</h2>
            </div>
          </div>
          <BarList
            empty="No productive days yet"
            items={productiveDays.map((day) => ({
              key: day.date,
              label: day.label,
              value: formatDuration(day.minutes),
              minutes: day.minutes,
            }))}
          />
        </article>

        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Clock</p>
              <h2>Most productive hours</h2>
            </div>
          </div>
          {hours.length === 0 ? (
            <p className="insight-empty">Session times are not available.</p>
          ) : (
            <ChartArea ariaLabel="Focus by hour" max={maxHour} showScale={showChartScale} className="hour-columns">
              {hours.map((bucket) => (
                <div
                  className="insight-column"
                  key={bucket.hour}
                  tabIndex={0}
                  aria-label={`${bucket.label}: ${formatDuration(bucket.minutes)} focused`}
                >
                  <div className="insight-bar-slot">
                    <span
                      className="insight-column-bar"
                      style={{ height: `${Math.max((bucket.minutes / maxHour) * 100, bucket.minutes ? 4 : 0)}%` }}
                      title={`${bucket.label}: ${formatDuration(bucket.minutes)}`}
                    />
                    <span className="chart-tooltip" role="tooltip">
                      <strong>{bucket.label}</strong>
                      <small>{formatDuration(bucket.minutes)} focused</small>
                    </span>
                  </div>
                  <span>{bucket.label}</span>
                </div>
              ))}
            </ChartArea>
          )}
        </article>
      </section>

      <section className="insight-grid">
        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Rhythm</p>
              <h2>{period === 'week' ? 'Typical focus by weekday' : 'Focus by weekday'}</h2>
              <p className="chart-context">
                {period === 'week'
                  ? `Average per day across ${selectedYear} · all activities`
                  : `Total focus in the selected ${period} · all activities`}
              </p>
            </div>
          </div>
          <ChartArea ariaLabel="Focus by weekday" max={maxWeekday} showScale={showChartScale}>
            {weekdays.map((day) => (
              <div
                className="insight-column"
                key={day.label}
                tabIndex={0}
                aria-label={period === 'week'
                  ? `${day.label} average: ${formatDuration(day.minutes)} per day across ${day.sampleDays} calendar days`
                  : `${day.label}: ${formatDuration(day.minutes)} focused`}
              >
                <div className="insight-bar-slot">
                  <span
                    className="insight-column-bar"
                    style={{ height: `${Math.max((day.minutes / maxWeekday) * 100, day.minutes ? 4 : 0)}%` }}
                    title={period === 'week'
                      ? `${day.label} average: ${formatDuration(day.minutes)} per day`
                      : `${day.label}: ${formatDuration(day.minutes)}`}
                  />
                  <span className="chart-tooltip" role="tooltip">
                    <strong>{period === 'week' ? `${day.label} average` : day.label}</strong>
                    <small>
                      {period === 'week'
                        ? `${formatDuration(day.minutes)} per day · ${day.sampleDays} calendar days`
                        : `${formatDuration(day.minutes)} focused`}
                    </small>
                  </span>
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </ChartArea>
        </article>

        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Goals</p>
              <h2>Planned vs actual</h2>
            </div>
          </div>
          <div className="plan-list">
            {weeks.length === 0 ? (
              <p className="insight-empty">No weeks in this period.</p>
            ) : (
              weeks.slice(-8).map((week) => (
                <div className="plan-row" key={week.weekStart}>
                  <span className="insight-bar-label">{week.label}</span>
                  <div className="plan-track">
                    <span
                      className="plan-actual"
                      style={{ width: `${(week.actualMinutes / maxPlan) * 100}%` }}
                    />
                    <i className="plan-target" style={{ left: `${(week.targetMinutes / maxPlan) * 100}%` }} />
                  </div>
                  <span className="insight-bar-value">
                    {formatDuration(week.actualMinutes)} / {formatDuration(week.targetMinutes)}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="insight-grid">
        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Consistency</p>
              <h2>Streaks and coverage</h2>
            </div>
          </div>
          <ul className="insight-stats">
            <li><span>Current streak</span><strong>{currentStreak || periodStreak} days</strong></li>
            <li><span>Longest streak</span><strong>{longestStreak} days</strong></li>
            <li><span>Active-day ratio</span><strong>{activeRatio}%</strong></li>
          </ul>
        </article>

        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Areas getting less time</h2>
            </div>
          </div>
          <BarList
            empty="Every activity is getting attention"
            items={neglected.map((area) => ({
              key: area.name,
              label: area.name,
              value: formatDuration(area.periodMinutes),
              minutes: area.periodMinutes,
              color: area.color,
              hint: `${formatDuration(area.yearMinutes)} this year`,
            }))}
          />
        </article>
      </section>

      <section className="insight-grid">
        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Sessions</p>
              <h2>Longest focus blocks</h2>
            </div>
          </div>
          <ul className="session-list">
            {longSessions.length === 0 ? (
              <li className="insight-empty">No sessions in this period.</li>
            ) : (
              longSessions.map((session, index) => (
                <li key={`${session.activityDate}-${session.activityName}-${index}`}>
                  <i style={{ backgroundColor: session.color }} />
                  <div>
                    <strong>{session.activityName}</strong>
                    <span>{formatShortDate(session.activityDate)}</span>
                  </div>
                  <em>{formatDuration(session.durationMinutes)}</em>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="card insight-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Journal</p>
              <h2>Recent notes</h2>
            </div>
          </div>
          <ul className="note-list">
            {notesList.length === 0 ? (
              <li className="insight-empty">No notes in this period.</li>
            ) : (
              notesList.map((item) => (
                <li key={`${item.date}-${item.note}`}>
                  <span>{formatShortDate(item.date)}</span>
                  <p>{item.note}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="card insight-card highlights-card">
        <div className="card-heading compact">
          <div>
            <p className="eyebrow">Highlights</p>
            <h2>Derived from your sessions</h2>
          </div>
        </div>
        <div className="highlight-grid">
          {highlights.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

type BarItem = {
  key: string
  label: string
  value: string
  minutes: number
  color?: string
  hint?: string
}

function ChartArea({
  ariaLabel,
  children,
  className = '',
  max,
  showScale,
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  max: number
  showScale: boolean
}) {
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0]

  return (
    <div className="chart-area">
      {showScale && (
        <div className="chart-scale" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{formatScaleValue(tick)}</span>
          ))}
        </div>
      )}
      <div
        aria-label={ariaLabel}
        className={`insight-columns chart-bars${className ? ` ${className}` : ''}`}
        role="img"
      >
        {children}
      </div>
    </div>
  )
}

function formatScaleValue(minutes: number) {
  if (minutes >= 60) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes)}m`
}

function BarList({
  empty,
  items,
  scrollable = false,
}: {
  empty: string
  items: BarItem[]
  scrollable?: boolean
}) {
  const max = Math.max(...items.map((item) => item.minutes), 1)

  if (!items.length) {
    return <p className="insight-empty">{empty}</p>
  }

  return (
    <div className={`insight-bars${scrollable ? ' scrollable' : ''}`}>
      {items.map((item) => (
        <div className="insight-bar-row" key={item.key}>
          <span className="insight-bar-label">
            {item.color && <i style={{ backgroundColor: item.color }} />}
            {item.label}
          </span>
          <div className="insight-bar-track">
            <span
              style={{
                width: `${(item.minutes / max) * 100}%`,
                background: item.color ?? 'var(--lime)',
              }}
            />
          </div>
          <span className="insight-bar-value">
            {item.value}
            {item.hint ? <small>{item.hint}</small> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

export default InsightsPage
