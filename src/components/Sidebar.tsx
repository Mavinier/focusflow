import {
  BarChart3,
  LayoutGrid,
  Menu,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { WeeklyGoalProgress } from '../api/activityApi'
import { formatDuration } from '../utils/tracker'
import UserMenu from './UserMenu'

type SidebarProps = {
  displayName: string
  onDataReset: () => void
  weeklyProgress: WeeklyGoalProgress
  onEditWeeklyGoal: () => void
}

function Sidebar({
  displayName,
  onDataReset,
  weeklyProgress,
  onEditWeeklyGoal,
}: SidebarProps) {
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
        <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end to="/">
          <LayoutGrid size={17} />
          Overview
        </NavLink>
        <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} to="/insights">
          <BarChart3 size={17} />
          Insights
        </NavLink>
        <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} to="/goals">
          <Target size={17} />
          Goals
        </NavLink>
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
        <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} to="/settings">
          <Settings size={17} />
          Settings
        </NavLink>
        <UserMenu displayName={displayName} onDataReset={onDataReset} />
      </div>
    </aside>
  )
}

export default Sidebar
