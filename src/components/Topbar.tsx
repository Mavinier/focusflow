import { Bell, CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchNotifications } from '../api/activityApi'
import NotificationCenter from './NotificationCenter'

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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count)
  }, [])

  useEffect(() => {
    fetchNotifications()
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => {
        // The bell remains available if notifications are temporarily unavailable.
      })
  }, [])

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <strong>{pageLabel}</strong>
      </div>
      <div className="topbar-actions">
        <div className="notification-wrapper">
          <button
            aria-expanded={isNotificationOpen}
            className="icon-button"
            type="button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            onClick={() => setIsNotificationOpen((open) => !open)}
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <NotificationCenter
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </div>
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
