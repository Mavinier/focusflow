import { Bell, CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'

type TopbarProps = {
  availableYears: number[]
  onLogActivity: () => void
  onYearChange: (year: number) => void
  year: number
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Activity overview',
  '/insights': 'Insights',
  '/goals': 'Goals',
  '/settings': 'Settings',
}

function Topbar({ availableYears, onLogActivity, onYearChange, year }: TopbarProps) {
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
        <label className="outline-button year-selector">
          <CalendarDays size={16} />
          <select
            aria-label="Select year"
            className="year-select"
            value={year}
            onChange={(event) => onYearChange(Number(event.target.value))}
          >
            {availableYears.map((availableYear) => (
              <option key={availableYear} value={availableYear}>
                {availableYear}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <button className="primary-button" type="button" onClick={onLogActivity}>
          <Plus size={16} />
          Log activity
        </button>
      </div>
    </header>
  )
}

export default Topbar
