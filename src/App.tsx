import { Flame } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchDashboard,
  fetchWeeklyGoal,
  type WeeklyGoalProgress,
} from './api/activityApi'
import ActivityHeatmap from './components/ActivityHeatmap'
import ActivityFormModal from './components/ActivityFormModal'
import DayDetail from './components/DayDetail'
import InsightCards from './components/InsightCards'
import Sidebar from './components/Sidebar'
import StatCards from './components/StatCards'
import Topbar from './components/Topbar'
import WeeklyGoalModal from './components/WeeklyGoalModal'
import { LAST_TRACKED_DATE, TRACKING_YEAR } from './data/activityData'
import type { DayData } from './types/tracker'
import { buildFocusMix, calculateActiveStreak } from './utils/analytics'

const initialWeeklyProgress: WeeklyGoalProgress = {
  weekStart: '',
  targetMinutes: 600,
  trackedMinutes: 0,
  remainingMinutes: 600,
  progressPercent: 0,
}

function App() {
  const [selectedDate, setSelectedDate] = useState(LAST_TRACKED_DATE)
  const [dayData, setDayData] = useState<DayData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isWeeklyGoalModalOpen, setIsWeeklyGoalModalOpen] = useState(false)
  const [weeklyProgress, setWeeklyProgress] = useState(initialWeeklyProgress)
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchDashboard(TRACKING_YEAR),
      fetchWeeklyGoal(LAST_TRACKED_DATE),
    ])
      .then(([records, progress]) => {
        if (!cancelled) {
          setDayData(records)
          setWeeklyProgress(progress)
          setError(null)
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load activity data.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataVersion])

  const selectedRecord = dayData[selectedDate]
  const activeDays = useMemo(
    () => Object.values(dayData).filter((record) => record.totalMinutes > 0),
    [dayData],
  )
  const totalTrackedMinutes = activeDays.reduce((total, record) => total + record.totalMinutes, 0)
  const currentStreak = useMemo(() => calculateActiveStreak(dayData), [dayData])
  const focusMix = useMemo(() => buildFocusMix(dayData), [dayData])
  const handleActivitySaved = (date: string) => {
    setSelectedDate(date)
    setIsActivityModalOpen(false)
    setDataVersion((version) => version + 1)
  }
  const handleWeeklyGoalSaved = (progress: WeeklyGoalProgress) => {
    setWeeklyProgress(progress)
    setIsWeeklyGoalModalOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        onEditWeeklyGoal={() => setIsWeeklyGoalModalOpen(true)}
        weeklyProgress={weeklyProgress}
      />

      <main className="main-content" id="overview">
        <Topbar onLogActivity={() => setIsActivityModalOpen(true)} />

        <div className="page-content">
          <section className="intro">
            <div>
              <p className="eyebrow">Friday, October 30, 2026</p>
              <h1>Your focus, in motion.</h1>
              <p className="intro-copy">
                A clear picture of the work and learning that moves you forward.
              </p>
              {isLoading && <p className="data-status">Loading your SQLite activity data…</p>}
              {error && <p className="data-status error">{error} Start the API with <code>npm run dev</code>.</p>}
            </div>
            <div className="streak-pill">
              <Flame size={16} />
              <span><strong>{currentStreak}</strong> day streak</span>
            </div>
          </section>

          <StatCards
            activeDaysCount={activeDays.length}
            topFocus={focusMix[0]}
            totalTrackedMinutes={totalTrackedMinutes}
          />

          <section className="tracker-layout">
            <ActivityHeatmap
              activeDaysCount={activeDays.length}
              dayData={dayData}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
            <DayDetail
              onAddEntry={() => setIsActivityModalOpen(true)}
              selectedDate={selectedDate}
              selectedRecord={selectedRecord}
            />
          </section>

          <InsightCards focusMix={focusMix} />
        </div>
      </main>

      <ActivityFormModal
        initialDate={selectedDate}
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSaved={handleActivitySaved}
      />
      <WeeklyGoalModal
        date={LAST_TRACKED_DATE}
        isOpen={isWeeklyGoalModalOpen}
        onClose={() => setIsWeeklyGoalModalOpen(false)}
        onSaved={handleWeeklyGoalSaved}
        progress={weeklyProgress}
      />
    </div>
  )
}

export default App
