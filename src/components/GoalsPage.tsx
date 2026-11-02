import { Check, Clock3, Pencil, Plus, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  fetchSessions,
  fetchWeeklyGoals,
  type FocusSessionRow,
  type WeeklyGoalRow,
} from '../api/activityApi'
import type { AppOutletContext } from '../types/app'
import {
  goalCompletionRate,
  plannedVsActual,
  totalMinutes,
  type WeekPlanActual,
} from '../utils/insights'
import {
  formatDuration,
  formatShortDate,
  getTodayDateKey,
  getYearReferenceDate,
} from '../utils/tracker'
import { getWeekEnd } from '../utils/week'

function GoalsPage() {
  const {
    dataVersion,
    onAddEntry,
    onEditWeeklyGoal,
    selectedYear,
    weeklyProgress,
  } = useOutletContext<AppOutletContext>()
  const today = getTodayDateKey()
  const referenceDate = getYearReferenceDate(selectedYear, today)
  const [sessions, setSessions] = useState<FocusSessionRow[]>([])
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
        setGoals(weeklyGoals)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load goals.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataVersion, selectedYear])

  const periodSessions = useMemo(
    () => sessions.filter((session) => session.activityDate <= referenceDate),
    [referenceDate, sessions],
  )
  const weeks = useMemo(
    () => plannedVsActual(
      periodSessions,
      goals,
      `${selectedYear}-01-01`,
      referenceDate,
    ),
    [goals, periodSessions, referenceDate, selectedYear],
  )
  const currentWeek = useMemo(
    () => weeks.find((week) => week.weekStart === weeklyProgress.weekStart) ?? weeks[weeks.length - 1],
    [weeks, weeklyProgress.weekStart],
  )
  const trackedMinutes = totalMinutes(periodSessions)
  const plannedMinutes = weeks.reduce((total, week) => total + week.targetMinutes, 0)
  const completedWeeks = weeks.filter((week) => week.met).length
  const activeWeeks = weeks.filter((week) => week.actualMinutes > 0).length
  const completion = goalCompletionRate(weeks)
  const displayedWeeks = [...weeks].reverse()

  return (
    <div className="page-content">
      <section className="intro goals-intro">
        <div>
          <p className="eyebrow">Goals · {selectedYear}</p>
          <h1>Make your time intentional.</h1>
          <p className="intro-copy">
            Set a target, see how your weeks performed, and keep your focus moving forward.
          </p>
          {isLoading && <p className="data-status">Loading goal data…</p>}
          {error && <p className="data-status error">{error} Start the API with <code>npm run dev</code>.</p>}
        </div>
        <div className="goals-actions">
          <button className="outline-button" type="button" onClick={onEditWeeklyGoal}>
            <Pencil size={15} />
            Edit weekly goal
          </button>
          <button className="primary-button" type="button" onClick={onAddEntry}>
            <Plus size={16} />
            Log activity
          </button>
        </div>
      </section>

      <section className="stat-grid goals-summary" aria-label="Goals summary">
        <article className="stat-card">
          <div className="stat-icon lime"><Target size={18} /></div>
          <div>
            <span className="stat-label">Current weekly goal</span>
            <strong>{formatDuration(weeklyProgress.targetMinutes)}</strong>
            <small>{formatDuration(weeklyProgress.trackedMinutes)} tracked this week</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet"><Clock3 size={18} /></div>
          <div>
            <span className="stat-label">Tracked in {selectedYear}</span>
            <strong>{formatDuration(trackedMinutes)}</strong>
            <small>{activeWeeks} active weeks</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon peach"><Check size={18} /></div>
          <div>
            <span className="stat-label">Goals reached</span>
            <strong>{completedWeeks} <em>/ {weeks.length}</em></strong>
            <small>{completion}% of weekly targets met</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon green"><Target size={18} /></div>
          <div>
            <span className="stat-label">Planned focus</span>
            <strong>{formatDuration(plannedMinutes)}</strong>
            <small>Across the selected year</small>
          </div>
        </article>
      </section>

      <section className="goals-grid">
        <article className="card current-goal-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Current focus</p>
              <h2>{currentWeek ? `${currentWeek.label} week` : 'This week'}</h2>
              {currentWeek && (
                <p>{formatShortDate(currentWeek.weekStart)} – {formatShortDate(getWeekEnd(currentWeek.weekStart))}</p>
              )}
            </div>
            <span className={`goal-status${weeklyProgress.remainingMinutes <= 0 ? ' complete' : ''}`}>
              {weeklyProgress.remainingMinutes <= 0 ? 'Goal met' : 'In progress'}
            </span>
          </div>

          <div className="current-goal-total">
            <strong>{formatDuration(weeklyProgress.trackedMinutes)}</strong>
            <span>of {formatDuration(weeklyProgress.targetMinutes)} focused</span>
          </div>
          <div className="goal-progress-track" aria-label={`${Math.round(weeklyProgress.progressPercent)} percent of weekly goal`}>
            <span style={{ width: `${Math.min(weeklyProgress.progressPercent, 100)}%` }} />
          </div>
          <div className="goal-progress-meta">
            <span>{Math.round(weeklyProgress.progressPercent)}% complete</span>
            <strong>
              {weeklyProgress.remainingMinutes > 0
                ? `${formatDuration(weeklyProgress.remainingMinutes)} remaining`
                : `${formatDuration(Math.abs(weeklyProgress.remainingMinutes))} over goal`}
            </strong>
          </div>
          <button className="goal-card-action" type="button" onClick={onEditWeeklyGoal}>
            <Pencil size={14} />
            Adjust this target
          </button>
        </article>

        <article className="card goal-history-card">
          <div className="card-heading compact">
            <div>
              <p className="eyebrow">Weekly history</p>
              <h2>Planned vs actual</h2>
            </div>
            <span className="goal-history-caption">{weeks.length} weeks</span>
          </div>
          <div className="goal-week-list">
            {displayedWeeks.map((week) => (
              <GoalWeekRow key={week.weekStart} week={week} />
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function GoalWeekRow({ week }: { week: WeekPlanActual }) {
  const progress = week.targetMinutes
    ? Math.min((week.actualMinutes / week.targetMinutes) * 100, 100)
    : 0
  const isOverGoal = week.actualMinutes > week.targetMinutes

  return (
    <div className={`goal-week-row${week.met ? ' met' : ''}`}>
      <div className="goal-week-label">
        <strong>{week.label}</strong>
        <span>{week.met ? 'Goal met' : 'Below target'}</span>
      </div>
      <div className="goal-week-track" aria-label={`${formatDuration(week.actualMinutes)} actual of ${formatDuration(week.targetMinutes)} planned`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="goal-week-value">
        <strong>{formatDuration(week.actualMinutes)}</strong>
        <span>/ {formatDuration(week.targetMinutes)}</span>
        {isOverGoal && <small className="goal-week-over">+{formatDuration(week.actualMinutes - week.targetMinutes)}</small>}
      </div>
    </div>
  )
}

export default GoalsPage
