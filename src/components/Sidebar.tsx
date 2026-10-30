import {
  BarChart3,
  LayoutGrid,
  Menu,
  MoreHorizontal,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'
import type { WeeklyGoalProgress } from '../api/activityApi'
import { formatDuration } from '../utils/tracker'

type SidebarProps = {
  weeklyProgress: WeeklyGoalProgress
  onEditWeeklyGoal: () => void
}

function Sidebar({ weeklyProgress, onEditWeeklyGoal }: SidebarProps) {
  const progressPercent = Math.round(weeklyProgress.progressPercent)
  const progressWidth = Math.min(weeklyProgress.progressPercent, 100)

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={18} strokeWidth={2.4} />
        </div>
        <span>focusflow</span>
      </div>

      <button className="mobile-menu-button" type="button" aria-label="Open navigation">
        <Menu size={18} />
      </button>

      <nav className="main-nav" aria-label="Main navigation">
        <a className="nav-item active" href="#overview">
          <LayoutGrid size={17} />
          Overview
        </a>
        <a className="nav-item" href="#insights">
          <BarChart3 size={17} />
          Insights
        </a>
        <a className="nav-item" href="#goals">
          <Target size={17} />
          Goals
        </a>
      </nav>

      <div className="sidebar-bottom">
        <button className="weekly-goal" type="button" onClick={onEditWeeklyGoal}>
          <div className="goal-header">
            <span>Weekly focus</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="goal-track">
            <span style={{ width: `${progressWidth}%` }} />
          </div>
          <p>
            {weeklyProgress.remainingMinutes > 0
              ? `${formatDuration(weeklyProgress.remainingMinutes)} left to reach your goal`
              : `${formatDuration(Math.abs(weeklyProgress.remainingMinutes))} over your goal`}
          </p>
        </button>
        <a className="nav-item" href="#settings">
          <Settings size={17} />
          Settings
        </a>
        <div className="user-chip">
          <div className="avatar">MM</div>
          <div>
            <strong>Marlon Moura</strong>
            <span>Personal workspace</span>
          </div>
          <MoreHorizontal size={16} className="user-menu" />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
