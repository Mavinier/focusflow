import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import {
  fetchAvailableYears,
  fetchDashboard,
  fetchWeeklyGoal,
  type WeeklyGoalProgress,
} from './api/activityApi'
import ActivityFormModal from './components/ActivityFormModal'
import GoalsPage from './components/GoalsPage'
import InsightsPage from './components/InsightsPage'
import OverviewPage from './components/OverviewPage'
import Sidebar from './components/Sidebar'
import SettingsPage from './components/SettingsPage'
import Topbar from './components/Topbar'
import WeeklyGoalModal from './components/WeeklyGoalModal'
import type { AppOutletContext } from './types/app'
import type { DayData } from './types/tracker'
import {
  buildFocusMix,
  calculateActiveStreak,
  calculatePercentChange,
  totalMinutesThrough,
} from './utils/analytics'
import {
  countDaysInclusive,
  getActivityMapRange,
  getPreviousYearReferenceDate,
  getTodayDateKey,
  getYearReferenceDate,
} from './utils/tracker'

const initialWeeklyProgress: WeeklyGoalProgress = {
  weekStart: '',
  targetMinutes: 600,
  trackedMinutes: 0,
  remainingMinutes: 600,
  progressPercent: 0,
}

function AppLayout() {
  const today = getTodayDateKey()
  const currentYear = Number(today.slice(0, 4))
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [useRollingHeatmap, setUseRollingHeatmap] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today)
  const [availableYears, setAvailableYears] = useState([currentYear])
  const [dayData, setDayData] = useState<DayData>({})
  const [comparisonDayData, setComparisonDayData] = useState<DayData>({})
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
      fetchAvailableYears(),
      fetchDashboard(selectedYear),
      fetchDashboard(selectedYear - 1),
      fetchWeeklyGoal(getYearReferenceDate(selectedYear, today)),
    ])
      .then(([years, records, previousRecords, progress]) => {
        if (!cancelled) {
          setAvailableYears(
            Array.from(new Set([...years, currentYear, selectedYear])).sort(
              (first, second) => second - first,
            ),
          )
          setDayData(records)
          setComparisonDayData(previousRecords)
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
  }, [currentYear, dataVersion, selectedYear, today])

  const heatmapRange = getActivityMapRange(selectedYear, today, useRollingHeatmap)
  const heatmapDayData = useMemo(
    () =>
      useRollingHeatmap && selectedYear === currentYear
        ? { ...comparisonDayData, ...dayData }
        : dayData,
    [comparisonDayData, currentYear, dayData, selectedYear, useRollingHeatmap],
  )
  const selectedRecord =
    dayData[selectedDate] ??
    (useRollingHeatmap && selectedYear === currentYear
      ? comparisonDayData[selectedDate]
      : undefined)
  const periodEnd = getYearReferenceDate(selectedYear, today)
  const previousPeriodEnd = getPreviousYearReferenceDate(selectedYear, today)
  const periodDayCount = countDaysInclusive(`${selectedYear}-01-01`, periodEnd)
  const visibleDayData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(dayData).filter(([date]) => date <= periodEnd),
      ) as DayData,
    [dayData, periodEnd],
  )
  const activeDays = useMemo(
    () => Object.values(visibleDayData).filter((record) => record.totalMinutes > 0),
    [visibleDayData],
  )
  const heatmapActiveDaysCount = useMemo(
    () =>
      Object.values(heatmapDayData).filter(
        (record) =>
          record.totalMinutes > 0 &&
          record.date >= heatmapRange.from &&
          record.date <= heatmapRange.to,
      ).length,
    [heatmapDayData, heatmapRange.from, heatmapRange.to],
  )
  const totalTrackedMinutes = totalMinutesThrough(visibleDayData, periodEnd)
  const currentStreak = useMemo(
    () => calculateActiveStreak(visibleDayData),
    [visibleDayData],
  )
  const focusMix = useMemo(() => buildFocusMix(visibleDayData), [visibleDayData])
  const comparisonPercent = calculatePercentChange(
    totalTrackedMinutes,
    totalMinutesThrough(comparisonDayData, previousPeriodEnd),
  )

  function handleYearChange(year: number) {
    setSelectedYear(year)
    setUseRollingHeatmap(false)
    setSelectedDate(year === currentYear ? today : `${year}-12-31`)
    setAvailableYears((years) =>
      Array.from(new Set([...years, year])).sort((first, second) => second - first),
    )
  }

  const handleActivitySaved = (date: string) => {
    const savedYear = Number(date.slice(0, 4))
    if (Number.isInteger(savedYear) && savedYear !== selectedYear) {
      setSelectedYear(savedYear)
      setUseRollingHeatmap(false)
    }
    setSelectedDate(date)
    setIsActivityModalOpen(false)
    setDataVersion((version) => version + 1)
  }
  const handleWeeklyGoalSaved = (progress: WeeklyGoalProgress) => {
    setWeeklyProgress(progress)
    setIsWeeklyGoalModalOpen(false)
    setDataVersion((version) => version + 1)
  }

  const outletContext: AppOutletContext = {
    activeDaysCount: activeDays.length,
    availableYears,
    comparisonPercent,
    currentStreak,
    dataVersion,
    dayData,
    error,
    focusMix,
    heatmapActiveDaysCount,
    heatmapDayData,
    isLoading,
    onHeatmapModeChange: setUseRollingHeatmap,
    onAddEntry: () => setIsActivityModalOpen(true),
    onEditWeeklyGoal: () => setIsWeeklyGoalModalOpen(true),
    onYearChange: handleYearChange,
    periodDayCount,
    selectedDate,
    selectedRecord,
    setSelectedDate,
    selectedYear,
    totalTrackedMinutes,
    useRollingHeatmap,
    weeklyProgress,
  }

  return (
    <div className="app-shell">
      <Sidebar
        onEditWeeklyGoal={() => setIsWeeklyGoalModalOpen(true)}
        weeklyProgress={weeklyProgress}
      />

      <main className="main-content">
        <Topbar
          availableYears={availableYears}
          onLogActivity={() => setIsActivityModalOpen(true)}
          onYearChange={handleYearChange}
          year={selectedYear}
        />
        <Outlet context={outletContext} />
      </main>

      <ActivityFormModal
        initialDate={selectedDate}
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSaved={handleActivitySaved}
      />
      <WeeklyGoalModal
        date={getYearReferenceDate(selectedYear, today)}
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
            element={<GoalsPage />}
          />
          <Route
            path="/settings"
            element={<SettingsPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
