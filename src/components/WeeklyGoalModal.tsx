import { LoaderCircle, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  updateWeeklyGoal,
  type WeeklyGoalProgress,
} from '../api/activityApi'
import { formatDuration } from '../utils/tracker'

type WeeklyGoalModalProps = {
  isOpen: boolean
  date: string
  progress: WeeklyGoalProgress
  onClose: () => void
  onSaved: (progress: WeeklyGoalProgress) => void
}

function WeeklyGoalModal({
  isOpen,
  date,
  progress,
  onClose,
  onSaved,
}: WeeklyGoalModalProps) {
  const [targetHours, setTargetHours] = useState('10')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTargetHours(String(progress.targetMinutes / 60))
    setError(null)
  }, [isOpen, progress.targetMinutes])

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hours = Number(targetHours)

    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Enter a weekly target greater than zero.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const updatedProgress = await updateWeeklyGoal(date, Math.round(hours * 60))
      onSaved(updatedProgress)
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save weekly goal.',
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
        className="activity-modal weekly-goal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-goal-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Weekly focus</p>
            <h2 id="weekly-goal-modal-title">Set your weekly goal</h2>
            <p>Choose how much focused time you want to invest this week.</p>
          </div>
          <button className="modal-close" type="button" aria-label="Close weekly goal form" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <form className="activity-form" onSubmit={handleSubmit}>
          <label>
            Weekly target
            <div className="goal-hours-input">
              <input
                required
                min="0.5"
                max="168"
                step="0.5"
                type="number"
                value={targetHours}
                onChange={(event) => setTargetHours(event.target.value)}
              />
              <span>hours</span>
            </div>
          </label>

          <div className="goal-progress-summary">
            <span>This week so far</span>
            <strong>
              {formatDuration(progress.trackedMinutes)} / {formatDuration(Math.round(Number(targetHours || 0) * 60))}
            </strong>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button className="cancel-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-button" type="submit" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save goal'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default WeeklyGoalModal
