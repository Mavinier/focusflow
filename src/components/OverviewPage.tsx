import { Flame } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../types/app'
import ActivityHeatmap from './ActivityHeatmap'
import DayDetail from './DayDetail'
import InsightCards from './InsightCards'
import StatCards from './StatCards'
import { formatDayHeading, getTodayDateKey } from '../utils/tracker'

function OverviewPage() {
  const {
    activeDaysCount,
    availableYears,
    comparisonPercent,
    currentStreak,
    dayData,
    error,
    focusMix,
    heatmapActiveDaysCount,
    heatmapDayData,
    isLoading,
    onHeatmapModeChange,
    onAddEntry,
    onYearChange,
    periodDayCount,
    selectedDate,
    selectedRecord,
    selectedYear,
    setSelectedDate,
    totalTrackedMinutes,
    useRollingHeatmap,
  } = useOutletContext<AppOutletContext>()
  const today = getTodayDateKey()
  const headingDate =
    selectedYear === Number(today.slice(0, 4)) ? today : `${selectedYear}-12-31`

  return (
    <div className="page-content">
      <section className="intro">
        <div>
          <p className="eyebrow">{formatDayHeading(headingDate)}</p>
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
        activeDaysCount={activeDaysCount}
        comparisonPercent={comparisonPercent}
        periodDayCount={periodDayCount}
        topFocus={focusMix[0]}
        totalTrackedMinutes={totalTrackedMinutes}
        year={selectedYear}
      />

      <section className="tracker-layout">
        <ActivityHeatmap
          activeDaysCount={heatmapActiveDaysCount}
          availableYears={availableYears}
          dayData={heatmapDayData}
          onModeChange={onHeatmapModeChange}
          onSelectDate={setSelectedDate}
          onYearChange={onYearChange}
          selectedDate={selectedDate}
          useRollingWindow={useRollingHeatmap}
          year={selectedYear}
        />
        <DayDetail
          onAddEntry={onAddEntry}
          selectedDate={selectedDate}
          selectedRecord={selectedRecord}
        />
      </section>

      <InsightCards focusMix={focusMix} year={selectedYear} />
    </div>
  )
}

export default OverviewPage
