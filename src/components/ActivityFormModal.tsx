import { LoaderCircle, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  createFocusSession,
  fetchActivities,
  type ActivityOption,
} from '../api/activityApi'
import { formatDuration } from '../utils/tracker'

type ActivityFormModalProps = {
  isOpen: boolean
  initialDate: string
  onClose: () => void
  onSaved: (date: string) => void
}

function toTimeValue(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDefaultTimeRange() {
  const now = new Date()
  const endMinutes = now.getHours() * 60 + now.getMinutes()
  return {
    startTime: toTimeValue(Math.max(0, endMinutes - 60)),
    endTime: toTimeValue(endMinutes),
  }
}

function getDurationMinutes(startTime: string, endTime: string) {
  if (!startTime || !endTime) return null

  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)

  return duration > 0 ? duration : null
}

function ActivityFormModal({
  isOpen,
  initialDate,
  onClose,
  onSaved,
}: ActivityFormModalProps) {
  const [activityDate, setActivityDate] = useState(initialDate)
  const [activityName, setActivityName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [note, setNote] = useState('')
  const [activities, setActivities] = useState<ActivityOption[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setActivityDate(initialDate)
    setActivityName('')
    const defaultTimeRange = getDefaultTimeRange()
    setStartTime(defaultTimeRange.startTime)
    setEndTime(defaultTimeRange.endTime)
    setNote('')
    setError(null)
    setIsLoadingActivities(true)

    fetchActivities()
      .then((loadedActivities) => {
        if (!cancelled) {
          setActivities(loadedActivities)
          setActivityName(loadedActivities[0]?.name ?? '')
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load existing activities.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingActivities(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialDate, isOpen])

  if (!isOpen) return null

  const durationMinutes = getDurationMinutes(startTime, endTime)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!durationMinutes) {
      setError('The end time must be later than the start time.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await createFocusSession({
        activityDate,
        activityName,
        startTime,
        endTime,
        note: note.trim() || undefined,
      })
      onSaved(activityDate)
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save activity.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="activity-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Focus journal</p>
            <h2 id="activity-modal-title">Log an activity</h2>
            <p>Capture where your time went and keep your progress visible.</p>
          </div>
          <button className="modal-close" type="button" aria-label="Close activity form" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <form className="activity-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Date
              <input
                required
                type="date"
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
              />
            </label>
            <div className="duration-preview-field">
              <span>Time spent</span>
              <div className="duration-preview">
                {durationMinutes ? formatDuration(durationMinutes) : 'Set a valid time range'}
              </div>
            </div>
          </div>

          <div className="form-row">
            <label>
              Started at
              <input
                required
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label>
              Ended at
              <input
                required
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>

          <label>
            What did you work on?
            <input
              required
              list="activity-options"
              placeholder="e.g. Java, SQL, research..."
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
            />
            <datalist id="activity-options">
              {activities.map((activity) => (
                <option key={activity.id} value={activity.name} />
              ))}
            </datalist>
          </label>

          <label>
            Note <span className="optional-label">Optional</span>
            <textarea
              rows={3}
              placeholder="What did you learn or accomplish?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button className="cancel-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-button"
              type="submit"
              disabled={isSaving || isLoadingActivities || !durationMinutes}
            >
              {isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save activity'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ActivityFormModal
