import { Bell, CheckCheck, Circle, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../api/activityApi'
import { formatShortDate } from '../utils/tracker'

type NotificationCenterProps = {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

function NotificationCenter({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsLoading(true)
    fetchNotifications()
      .then((data) => {
        if (cancelled) return
        setNotifications(data.notifications)
        onUnreadCountChange(data.unreadCount)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load notifications.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, onUnreadCountChange])

  async function handleRead(notification: NotificationItem) {
    if (notification.readAt) return

    try {
      await markNotificationRead(notification.id)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      )
      onUnreadCountChange(Math.max(0, unreadCount - 1))
    } catch {
      setError('Unable to mark this notification as read.')
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead()
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? new Date().toISOString(),
        })),
      )
      onUnreadCountChange(0)
    } catch {
      setError('Unable to mark notifications as read.')
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  return (
    <section className="notification-center" aria-label="Notifications">
      <div className="notification-center-header">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Notifications</h2>
        </div>
        <div className="notification-center-actions">
          {unreadCount > 0 && (
            <button className="notification-action" type="button" onClick={handleReadAll}>
              <CheckCheck size={14} />
              Read all
            </button>
          )}
          <button className="notification-close" type="button" aria-label="Close notifications" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="notification-empty">
          <LoaderCircle className="spin" size={16} />
          Loading notifications…
        </div>
      )}
      {error && <p className="notification-error">{error}</p>}
      {!isLoading && !error && notifications.length === 0 && (
        <div className="notification-empty">
          <Bell size={17} />
          You are all caught up.
        </div>
      )}
      {!isLoading && notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div
              className={`notification-item${notification.readAt ? '' : ' unread'}`}
              key={notification.id}
            >
              <span className={`notification-type-dot type-${notification.type}`}>
                <Circle size={8} fill="currentColor" />
              </span>
              <Link to={notification.href} onClick={onClose}>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <small>{formatNotificationDate(notification.createdAt)}</small>
              </Link>
              {!notification.readAt && (
                <button
                  className="notification-mark-read"
                  type="button"
                  aria-label={`Mark ${notification.title} as read`}
                  onClick={() => handleRead(notification)}
                >
                  <CheckCheck size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  return formatShortDate([
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-'))
}

export default NotificationCenter
