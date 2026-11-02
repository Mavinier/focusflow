import { Check, ChevronDown, LoaderCircle, Palette, Save, Settings2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  fetchActivities,
  fetchSettings,
  type ActivityOption,
  type AppSettings,
  type UpdateSettingsInput,
  updateActivity,
  updateSettings,
} from '../api/activityApi'
import type { AppOutletContext } from '../types/app'
import { ACTIVITY_COLOR_PALETTE } from '../data/activityColors'

type SettingsDraft = AppSettings

function SettingsPage() {
  const { dataVersion, onSettingsSaved } = useOutletContext<AppOutletContext>()
  const [settings, setSettings] = useState<SettingsDraft | null>(null)
  const [activities, setActivities] = useState<ActivityOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savingActivityId, setSavingActivityId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([fetchSettings(), fetchActivities(true)])
      .then(([loadedSettings, loadedActivities]) => {
        if (cancelled) return
        setSettings(loadedSettings)
        setActivities(loadedActivities)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load settings.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataVersion])

  function updateDraft<Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) {
    setSettings((current) => current ? { ...current, [key]: value } : current)
    setSavedMessage(null)
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settings) return

    setIsSaving(true)
    setError(null)
    setSavedMessage(null)

    const input: UpdateSettingsInput = {
      displayName: settings.displayName,
      defaultWeeklyTargetMinutes: settings.defaultWeeklyTargetMinutes,
      weekStartsOn: settings.weekStartsOn,
      theme: settings.theme,
      notificationsEnabled: settings.notificationsEnabled,
      goalNotificationsEnabled: settings.goalNotificationsEnabled,
      streakNotificationsEnabled: settings.streakNotificationsEnabled,
      inactivityNotificationsEnabled: settings.inactivityNotificationsEnabled,
      inactivityThresholdDays: settings.inactivityThresholdDays,
    }

    try {
      const updatedSettings = await updateSettings(input)
      setSettings(updatedSettings)
      onSettingsSaved(updatedSettings)
      setSavedMessage('Settings saved.')
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  function updateActivityDraft(
    id: number,
    key: keyof Pick<ActivityOption, 'name' | 'color' | 'icon'>,
    value: string,
  ) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, [key]: value }
          : activity,
      ),
    )
    setActivityError(null)
  }

  async function handleActivitySave(activity: ActivityOption) {
    setSavingActivityId(activity.id)
    setActivityError(null)

    try {
      const updatedActivity = await updateActivity(activity.id, {
        name: activity.name,
        color: activity.color,
        icon: activity.icon,
      })
      setActivities((current) =>
        current.map((item) => item.id === updatedActivity.id ? updatedActivity : item),
      )
      setSavedMessage(`${updatedActivity.name} updated.`)
    } catch (requestError: unknown) {
      setActivityError(
        requestError instanceof Error ? requestError.message : 'Unable to update activity.',
      )
    } finally {
      setSavingActivityId(null)
    }
  }

  async function handleActivityToggle(activity: ActivityOption) {
    setSavingActivityId(activity.id)
    setActivityError(null)

    try {
      const updatedActivity = await updateActivity(activity.id, {
        isActive: !activity.isActive,
      })
      setActivities((current) =>
        current.map((item) => item.id === updatedActivity.id ? updatedActivity : item),
      )
      setSavedMessage(
        updatedActivity.isActive
          ? `${updatedActivity.name} restored for new sessions.`
          : `${updatedActivity.name} archived. Existing sessions are preserved.`,
      )
    } catch (requestError: unknown) {
      setActivityError(
        requestError instanceof Error ? requestError.message : 'Unable to update activity.',
      )
    } finally {
      setSavingActivityId(null)
    }
  }

  return (
    <div className="page-content">
      <section className="intro settings-intro">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1>Make FocusFlow fit your rhythm.</h1>
          <p className="intro-copy">
            Keep your preferences, reminders, and focus areas aligned with the way you work.
          </p>
          {isLoading && <p className="data-status">Loading settings…</p>}
          {error && <p className="data-status error">{error} Start the API with <code>npm run dev</code>.</p>}
        </div>
        {savedMessage && (
          <div className="settings-saved">
            <Check size={15} />
            {savedMessage}
          </div>
        )}
      </section>

      {settings && (
        <form className="settings-layout" onSubmit={handleSettingsSubmit}>
          <section className="settings-column">
            <article className="card settings-card">
              <div className="settings-card-heading">
                <span className="settings-icon"><Settings2 size={16} /></span>
                <div>
                  <p className="eyebrow">Preferences</p>
                  <h2>Workspace defaults</h2>
                </div>
              </div>

              <div className="settings-form-grid">
                <label className="settings-field settings-field-wide">
                  Display name
                  <input
                    maxLength={80}
                    required
                    value={settings.displayName}
                    onChange={(event) => updateDraft('displayName', event.target.value)}
                  />
                  <small>Used in your workspace profile.</small>
                </label>

                <label className="settings-field">
                  Default weekly focus
                  <div className="settings-input-with-suffix">
                    <input
                      min="0.5"
                      max="168"
                      step="0.5"
                      type="number"
                      value={settings.defaultWeeklyTargetMinutes / 60}
                      onChange={(event) => updateDraft(
                        'defaultWeeklyTargetMinutes',
                        Math.round(Number(event.target.value || 0) * 60),
                      )}
                    />
                    <span>hours</span>
                  </div>
                </label>

                <label className="settings-field">
                  Week starts on
                  <div className="settings-select-control">
                    <select
                      value={settings.weekStartsOn}
                      onChange={(event) => updateDraft('weekStartsOn', Number(event.target.value))}
                    >
                      <option value={1}>Monday</option>
                      <option value={0}>Sunday</option>
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </label>

                <label className="settings-field">
                  Theme
                  <div className="settings-select-control">
                    <select disabled value={settings.theme}>
                      <option value="dark">Dark</option>
                    </select>
                    <ChevronDown size={14} />
                  </div>
                  <small>More themes can be added later.</small>
                </label>
              </div>
            </article>

            <article className="card settings-card">
              <div className="settings-card-heading">
                <span className="settings-icon peach"><Palette size={16} /></span>
                <div>
                  <p className="eyebrow">Focus areas</p>
                  <h2>Activity color and icon</h2>
                </div>
              </div>
              <p className="settings-card-copy">
                Rename an area or adjust its visual identity. Existing sessions keep their history.
              </p>

              <div className="activity-settings-list">
                {activities.map((activity) => (
                  <ActivitySettingsRow
                    activity={activity}
                    isSaving={savingActivityId === activity.id}
                    key={activity.id}
                    onChange={updateActivityDraft}
                    onSave={handleActivitySave}
                  onToggleActive={handleActivityToggle}
                  />
                ))}
              </div>
              {activityError && <p className="form-error">{activityError}</p>}
            </article>
          </section>

          <section className="settings-column">
            <article className="card settings-card notification-preferences">
              <div className="settings-card-heading">
                <span className="settings-icon green"><Check size={16} /></span>
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h2>Useful nudges only</h2>
                </div>
              </div>
              <p className="settings-card-copy">
                FocusFlow creates in-app reminders from your progress. Nothing is sent outside this app.
              </p>

              <SettingToggle
                checked={settings.notificationsEnabled}
                description="Show notifications in the bell menu."
                label="In-app notifications"
                onChange={(checked) => updateDraft('notificationsEnabled', checked)}
              />
              <SettingToggle
                checked={settings.goalNotificationsEnabled}
                disabled={!settings.notificationsEnabled}
                description="Celebrate reaching or approaching a weekly goal."
                label="Goal progress"
                onChange={(checked) => updateDraft('goalNotificationsEnabled', checked)}
              />
              <SettingToggle
                checked={settings.streakNotificationsEnabled}
                disabled={!settings.notificationsEnabled}
                description="Show milestones for consecutive active days."
                label="Streak milestones"
                onChange={(checked) => updateDraft('streakNotificationsEnabled', checked)}
              />
              <SettingToggle
                checked={settings.inactivityNotificationsEnabled}
                disabled={!settings.notificationsEnabled}
                description="Remind you after a few days without a session."
                label="Inactivity reminders"
                onChange={(checked) => updateDraft('inactivityNotificationsEnabled', checked)}
              />

              <label className="settings-field inactivity-threshold">
                Remind me after
                <div className="settings-input-with-suffix">
                  <input
                    disabled={!settings.notificationsEnabled || !settings.inactivityNotificationsEnabled}
                    max="30"
                    min="1"
                    type="number"
                    value={settings.inactivityThresholdDays}
                    onChange={(event) => updateDraft(
                      'inactivityThresholdDays',
                      Number(event.target.value || 1),
                    )}
                  />
                  <span>days</span>
                </div>
              </label>
            </article>

            <article className="card settings-card settings-save-card">
              <div>
                <p className="eyebrow">Ready?</p>
                <h2>Save your preferences</h2>
                <p>Changes apply to your next activity and notification refresh.</p>
              </div>
              <button className="save-button settings-save-button" disabled={isSaving} type="submit">
                {isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Saving…' : 'Save settings'}
              </button>
            </article>
          </section>
        </form>
      )}
    </div>
  )
}

type ActivitySettingsRowProps = {
  activity: ActivityOption
  isSaving: boolean
  onChange: (
    id: number,
    key: keyof Pick<ActivityOption, 'name' | 'color' | 'icon'>,
    value: string,
  ) => void
  onSave: (activity: ActivityOption) => void
  onToggleActive: (activity: ActivityOption) => void
}

function ActivitySettingsRow({
  activity,
  isSaving,
  onChange,
  onSave,
  onToggleActive,
}: ActivitySettingsRowProps) {
  return (
    <div className={`activity-settings-row${activity.isActive ? '' : ' archived'}`}>
      <span className="activity-color-preview" style={{ backgroundColor: activity.color }} />
      <input
        aria-label={`${activity.name} name`}
        className="activity-name-input"
        value={activity.name}
        onChange={(event) => onChange(activity.id, 'name', event.target.value)}
      />
      <div className="settings-select-control compact">
        <select
          aria-label={`${activity.name} icon`}
          value={activity.icon}
          onChange={(event) => onChange(activity.id, 'icon', event.target.value)}
        >
          <option value="code">Code</option>
          <option value="database">Database</option>
          <option value="book">Book</option>
          <option value="work">Work</option>
          <option value="notes">Notes</option>
          <option value="fitness">Fitness</option>
          <option value="design">Design</option>
          <option value="language">Language</option>
          <option value="music">Music</option>
          <option value="personal">Personal</option>
          <option value="study">Study</option>
        </select>
        <ChevronDown size={12} />
      </div>
      <div className="settings-select-control compact">
        <select
          aria-label={`${activity.name} color`}
          value={activity.color}
          onChange={(event) => onChange(activity.id, 'color', event.target.value)}
        >
          {ACTIVITY_COLOR_PALETTE.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
        <ChevronDown size={12} />
      </div>
      <button
        aria-label={`Save ${activity.name}`}
        className="activity-save-button"
        disabled={isSaving}
        type="button"
        onClick={() => onSave(activity)}
      >
        {isSaving ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}
      </button>
      <button
        aria-label={`${activity.isActive ? 'Archive' : 'Restore'} ${activity.name}`}
        className="activity-archive-button"
        disabled={isSaving}
        type="button"
        onClick={() => onToggleActive(activity)}
      >
        {activity.isActive ? 'Archive' : 'Restore'}
      </button>
    </div>
  )
}

function SettingToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`settings-toggle${disabled ? ' disabled' : ''}`}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  )
}

export default SettingsPage
