import { Flame } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../types/app'
import ActivityHeatmap from './ActivityHeatmap'
import DayDetail from './DayDetail'
import InsightCards from './InsightCards'
import StatCards from './StatCards'

function OverviewPage() {
  const {
    activeDaysCount,
    currentStreak,
    dayData,
    error,
    focusMix,
    isLoading,
    onAddEntry,
    selectedDate,
    selectedRecord,
    setSelectedDate,
    totalTrackedMinutes,
  } = useOutletContext<AppOutletContext>()

  return (
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
        activeDaysCount={activeDaysCount}
        topFocus={focusMix[0]}
        totalTrackedMinutes={totalTrackedMinutes}
      />

      <section className="tracker-layout">
        <ActivityHeatmap
          activeDaysCount={activeDaysCount}
          dayData={dayData}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
        />
        <DayDetail
          onAddEntry={onAddEntry}
          selectedDate={selectedDate}
          selectedRecord={selectedRecord}
        />
      </section>

      <InsightCards focusMix={focusMix} />
    </div>
  )
}

export default OverviewPage
