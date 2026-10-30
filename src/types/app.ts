import type { WeeklyGoalProgress } from '../api/activityApi'
import type { FocusMixItem } from '../utils/analytics'
import type { DayData, DayRecord } from './tracker'

export type AppOutletContext = {
  activeDaysCount: number
  currentStreak: number
  dataVersion: number
  dayData: DayData
  error: string | null
  focusMix: FocusMixItem[]
  isLoading: boolean
  onAddEntry: () => void
  selectedDate: string
  selectedRecord: DayRecord | undefined
  setSelectedDate: (date: string) => void
  totalTrackedMinutes: number
  weeklyProgress: WeeklyGoalProgress
}
