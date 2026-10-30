import { Bell, CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'

type TopbarProps = {
  onLogActivity: () => void
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Activity overview',
  '/insights': 'Insights',
  '/goals': 'Goals',
  '/settings': 'Settings',
}

function Topbar({ onLogActivity }: TopbarProps) {
  const { pathname } = useLocation()
  const pageLabel = PAGE_LABELS[pathname] ?? 'Activity overview'

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <strong>{pageLabel}</strong>
      </div>
      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={17} />
          <span className="notification-dot" />
        </button>
        <button className="outline-button" type="button">
          <CalendarDays size={16} />
          2026
          <ChevronDown size={15} />
        </button>
        <button className="primary-button" type="button" onClick={onLogActivity}>
          <Plus size={16} />
          Log activity
        </button>
      </div>
    </header>
  )
}

export default Topbar
