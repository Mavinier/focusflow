import type { WeeklyGoalProgress } from '../api/activityApi'
import type { FocusMixItem } from '../utils/analytics'
import type { DayData, DayRecord } from './tracker'

export type AppOutletContext = {
  activeDaysCount: number
  availableYears: number[]
  comparisonPercent: number | null
  currentStreak: number
  dataVersion: number
  dayData: DayData
  error: string | null
  focusMix: FocusMixItem[]
  heatmapActiveDaysCount: number
  heatmapDayData: DayData
  onHeatmapModeChange: (useRolling: boolean) => void
  useRollingHeatmap: boolean
  isLoading: boolean
  onAddEntry: () => void
  onEditWeeklyGoal: () => void
  onYearChange: (year: number) => void
  periodDayCount: number
  selectedDate: string
  selectedRecord: DayRecord | undefined
  selectedYear: number
  setSelectedDate: (date: string) => void
  totalTrackedMinutes: number
  weeklyProgress: WeeklyGoalProgress
}
