import {
  Database,
  Download,
  Info,
  MoreHorizontal,
  RotateCcw,
  Settings,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { exportData, resetActivityData } from '../api/activityApi'

type UserMenuProps = {
  displayName: string
  onDataReset: () => void
}

function UserMenu({ displayName, onDataReset }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  async function handleExport() {
    setIsExporting(true)
    setError(null)

    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `focusflow-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setIsOpen(false)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to export data.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Reset all activity data? This removes focus sessions, notes, goals, activities, and notifications. Your settings will be kept.',
    )
    if (!confirmed) return

    setIsResetting(true)
    setError(null)

    try {
      await resetActivityData()
      setIsOpen(false)
      onDataReset()
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reset data.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        className="user-chip"
        type="button"
        onClick={() => {
          setError(null)
          setIsOpen((open) => !open)
        }}
      >
        <div className="avatar">{getInitials(displayName)}</div>
        <div>
          <strong>{displayName}</strong>
          <span>Personal workspace</span>
        </div>
        <MoreHorizontal size={16} className="user-menu" />
      </button>

      {isOpen && (
        <div className="user-menu-popover">
          <div className="user-menu-heading">
            <span>Workspace actions</span>
          </div>
          <Link className="user-menu-item" to="/settings" onClick={() => setIsOpen(false)}>
            <Settings size={15} />
            <span>Edit profile and settings</span>
          </Link>
          <button className="user-menu-item" disabled={isExporting} type="button" onClick={handleExport}>
            <Download size={15} />
            <span>{isExporting ? 'Preparing export…' : 'Export data as JSON'}</span>
          </button>
          <div className="user-menu-info">
            <Database size={14} />
            <span>SQLite database · data/focusflow.db</span>
          </div>
          <div className="user-menu-info">
            <Info size={14} />
            <span>FocusFlow local workspace</span>
          </div>
          <button className="user-menu-item danger" disabled={isResetting} type="button" onClick={handleReset}>
            <RotateCcw size={15} />
            <span>{isResetting ? 'Resetting data…' : 'Reset activity data'}</span>
          </button>
          {error && <p className="user-menu-error">{error}</p>}
        </div>
      )}
    </div>
  )
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return initials.toUpperCase() || 'FF'
}

export default UserMenu
