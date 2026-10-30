import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  Code2,
  Database,
  NotebookPen,
  Plus,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Activity, ActivityIconName, DayRecord } from '../types/tracker'
import {
  formatDayHeading,
  formatDuration,
  getCategoryLabel,
  getIntensity,
} from '../utils/tracker'

type DayDetailProps = {
  selectedDate: string
  selectedRecord?: DayRecord
  onAddEntry: () => void
}

function getActivityIcon(icon: ActivityIconName): ReactNode {
  const iconProps = { size: 16, strokeWidth: 2 }
  switch (icon) {
    case 'code':
      return <Code2 {...iconProps} />
    case 'database':
      return <Database {...iconProps} />
    case 'book':
      return <BookOpen {...iconProps} />
    case 'work':
      return <BriefcaseBusiness {...iconProps} />
    default:
      return <NotebookPen {...iconProps} />
  }
}

function ActivityRow({ activity, maxDuration }: { activity: Activity; maxDuration: number }) {
  return (
    <div className="activity-row">
      <div className="activity-row-top">
        <div className="activity-name">
          <span
            className="activity-icon"
            style={{ color: activity.color, backgroundColor: `${activity.color}16` }}
          >
            {getActivityIcon(activity.icon)}
          </span>
          <strong>{activity.name}</strong>
        </div>
        <span className="activity-duration">{formatDuration(activity.duration)}</span>
      </div>
      <div className="activity-progress">
        <span
          style={{
            width: `${(activity.duration / maxDuration) * 100}%`,
            backgroundColor: activity.color,
          }}
        />
      </div>
    </div>
  )
}

function getDayMessage(totalMinutes: number, note?: string) {
  if (note?.trim()) return note
  if (totalMinutes === 0) {
    return 'No activities logged yet. Take a small step whenever you are ready.'
  }
  if (totalMinutes < 90) {
    return 'A light day still counts. You kept your focus moving forward.'
  }
  if (totalMinutes < 240) {
    return 'A steady day. You made progress without overloading your schedule.'
  }
  return 'A focused day of meaningful progress. Keep building on this momentum.'
}

function DayDetail({ selectedDate, selectedRecord, onAddEntry }: DayDetailProps) {
  const selectedActivities = selectedRecord?.activities ?? []
  const selectedTotal = selectedRecord?.totalMinutes ?? 0
  const maxActivityDuration = Math.max(
    ...selectedActivities.map((activity) => activity.duration),
    1,
  )
  const mostFocusedActivity = selectedActivities.reduce(
    (current, activity) => (activity.duration > current.duration ? activity : current),
    selectedActivities[0] ?? { name: 'your focus', duration: 0 },
  )

  return (
    <aside className="card detail-card" aria-live="polite">
      <div className="detail-topline">
        <span className="eyebrow">Selected day</span>
      </div>
      <h2>{formatDayHeading(selectedDate)}</h2>
      <div className={`activity-status status-${getIntensity(selectedTotal)}`}>
        <span />
        {getCategoryLabel(selectedTotal)}
      </div>

      <div className="detail-total">
        <strong>{formatDuration(selectedTotal)}</strong>
        <span>focused time</span>
      </div>

      <div className="detail-note">
        <NotebookPen size={15} />
        <p>{getDayMessage(selectedTotal, selectedRecord?.note)}</p>
      </div>

      <div className="breakdown-heading">
        <div>
          <span className="section-label">Focus breakdown</span>
          <strong>{selectedActivities.length ? `${selectedActivities.length} areas` : 'No entries yet'}</strong>
        </div>
        {selectedActivities.length > 0 && (
          <span className="breakdown-total">{formatDuration(selectedTotal)}</span>
        )}
      </div>

      {selectedActivities.length > 0 ? (
        <div className="activity-list">
          {selectedActivities.map((activity) => (
            <ActivityRow
              activity={activity}
              key={activity.name}
              maxDuration={maxActivityDuration}
            />
          ))}
        </div>
      ) : (
        <div className="empty-day">
          <span><NotebookPen size={17} /></span>
          <p>No activities logged for this day.</p>
          <small>Click “Log activity” to add your first entry.</small>
        </div>
      )}

      <button className="add-entry-button" type="button" onClick={onAddEntry}>
        <Plus size={16} />
        Add another entry
      </button>

      {selectedActivities.length > 0 && (
        <p className="detail-tip">
          <Check size={14} />
          Most time went to <strong>{mostFocusedActivity.name}</strong>
        </p>
      )}
    </aside>
  )
}

export default DayDetail
