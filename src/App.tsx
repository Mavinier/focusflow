import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import {
  fetchDashboard,
  fetchWeeklyGoal,
  type WeeklyGoalProgress,
} from './api/activityApi'
import ActivityFormModal from './components/ActivityFormModal'
import InsightsPage from './components/InsightsPage'
import OverviewPage from './components/OverviewPage'
import PlaceholderPage from './components/PlaceholderPage'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import WeeklyGoalModal from './components/WeeklyGoalModal'
import { LAST_TRACKED_DATE, TRACKING_YEAR } from './data/activityData'
import type { AppOutletContext } from './types/app'
import type { DayData } from './types/tracker'
import { buildFocusMix, calculateActiveStreak } from './utils/analytics'

const initialWeeklyProgress: WeeklyGoalProgress = {
  weekStart: '',
  targetMinutes: 600,
  trackedMinutes: 0,
  remainingMinutes: 600,
  progressPercent: 0,
}

function AppLayout() {
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

  const outletContext: AppOutletContext = {
    activeDaysCount: activeDays.length,
    currentStreak,
    dataVersion,
    dayData,
    error,
    focusMix,
    isLoading,
    onAddEntry: () => setIsActivityModalOpen(true),
    selectedDate,
    selectedRecord,
    setSelectedDate,
    totalTrackedMinutes,
    weeklyProgress,
  }

  return (
    <div className="app-shell">
      <Sidebar
        onEditWeeklyGoal={() => setIsWeeklyGoalModalOpen(true)}
        weeklyProgress={weeklyProgress}
      />

      <main className="main-content">
        <Topbar onLogActivity={() => setIsActivityModalOpen(true)} />
        <Outlet context={outletContext} />
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route
            path="/goals"
            element={
              <PlaceholderPage
                copy="Weekly and monthly targets will live here. Use the sidebar card to edit this week’s focus goal."
                eyebrow="Coming soon"
                title="Goals"
              />
            }
          />
          <Route
            path="/settings"
            element={
              <PlaceholderPage
                copy="Preferences and activity management will live here in a later pass."
                eyebrow="Coming soon"
                title="Settings"
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
