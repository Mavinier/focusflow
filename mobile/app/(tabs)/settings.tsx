import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'

import { ACTIVITY_COLOR_PALETTE } from '../../src/data/activityColors'
import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { repositories } from '../../src/db/repositories'
import type { Activity } from '../../src/db/schema'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'
import type { ActivityIconName } from '../../src/types/tracker'
import {
  getNotificationPermission,
  refreshLocalReminders,
  requestNotificationPermission,
  type NotificationPermission,
} from '../../src/services/notifications'

function SettingRow({
  disabled = false,
  description,
  label,
  value,
  onValueChange,
}: {
  disabled?: boolean
  description: string
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? colors.accent : colors.textMuted}
        trackColor={{ false: colors.surfaceRaised, true: colors.accentPressed }}
        value={value}
      />
    </View>
  )
}

const iconOptions: { label: string; value: ActivityIconName }[] = [
  { label: 'Code', value: 'code' },
  { label: 'Data', value: 'database' },
  { label: 'Book', value: 'book' },
  { label: 'Work', value: 'work' },
  { label: 'Notes', value: 'notes' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Design', value: 'design' },
  { label: 'Language', value: 'language' },
  { label: 'Music', value: 'music' },
  { label: 'Personal', value: 'personal' },
  { label: 'Study', value: 'study' },
]

function ActivityAreaRow({
  activity,
  onChange,
  onSave,
  onToggleActive,
}: {
  activity: Activity
  onChange: (
    id: number,
    key: keyof Pick<Activity, 'name' | 'color' | 'icon'>,
    value: string,
  ) => void
  onSave: (activity: Activity) => void
  onToggleActive: (activity: Activity) => void
}) {
  return (
    <View style={[styles.areaRow, !activity.isActive && styles.archivedAreaRow]}>
      <View style={styles.areaHeading}>
        <View style={[styles.areaDot, { backgroundColor: activity.color }]} />
        <TextInput
          accessibilityLabel={`${activity.name} name`}
          onChangeText={(value) => onChange(activity.id, 'name', value)}
          style={styles.areaNameInput}
          value={activity.name}
        />
      </View>
      <View style={styles.choiceRow}>
        {iconOptions.map((option) => (
          <Pressable
            accessibilityLabel={`${activity.name} icon ${option.label}`}
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(activity.id, 'icon', option.value)}
            style={[
              styles.smallChoice,
              activity.icon === option.value && styles.smallChoiceSelected,
            ]}
          >
            <Text style={styles.smallChoiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <ColorChoices
        onSelect={(color) => onChange(activity.id, 'color', color)}
        selectedColor={activity.color}
      />
      <View style={styles.areaActions}>
        <Pressable
          accessibilityLabel={`Save ${activity.name}`}
          accessibilityRole="button"
          onPress={() => onSave(activity)}
          style={styles.saveAreaButton}
        >
          <Text style={styles.saveAreaText}>Save area</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${activity.isActive ? 'Archive' : 'Restore'} ${activity.name}`}
          accessibilityRole="button"
          onPress={() => onToggleActive(activity)}
          style={styles.archiveAreaButton}
        >
          <Text style={styles.archiveAreaText}>
            {activity.isActive ? 'Archive area' : 'Restore area'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

function ColorChoices({
  onSelect,
  selectedColor,
}: {
  onSelect: (color: string) => void
  selectedColor: string
}) {
  return (
    <View style={styles.colorChoices}>
      {ACTIVITY_COLOR_PALETTE.map((color) => (
        <Pressable
          accessibilityLabel={`Color ${color}`}
          accessibilityRole="button"
          key={color}
          onPress={() => onSelect(color)}
          style={[
            styles.colorChoice,
            { backgroundColor: color },
            selectedColor === color && styles.selectedColorChoice,
          ]}
        />
      ))}
    </View>
  )
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState(() => repositories.appSettings.get())
  const [activities, setActivities] = useState<Activity[]>([])
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaColor, setNewAreaColor] = useState<string>(ACTIVITY_COLOR_PALETTE[0])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('undetermined')
  const [scheduledReminderCount, setScheduledReminderCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isDataBusy, setIsDataBusy] = useState(false)
  const [isActivityAreasExpanded, setIsActivityAreasExpanded] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let active = true
      try {
        setSettings(repositories.appSettings.get())
        setActivities(repositories.activities.list())
        setError(null)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
      }
      void getNotificationPermission().then((permission) => {
        if (active) setNotificationPermission(permission)
      }).catch(() => {
        if (active) setNotificationPermission('undetermined')
      })
      return () => {
        active = false
      }
    }, []),
  )

  function updateSetting<Key extends keyof NonNullable<typeof settings>>(
    key: Key,
    value: NonNullable<typeof settings>[Key],
  ) {
    setSettings((current) => current ? { ...current, [key]: value } : current)
    setMessage(null)
  }

  async function saveSettings() {
    if (!settings) return
    setIsSaving(true)
    try {
      const updated = repositories.appSettings.update({
        displayName: settings.displayName.trim() || 'FocusFlow',
        defaultWeeklyTargetMinutes: Math.min(
          10080,
          Math.max(30, settings.defaultWeeklyTargetMinutes),
        ),
        weekStartsOn: settings.weekStartsOn,
        theme: settings.theme,
        notificationsEnabled: settings.notificationsEnabled,
        goalNotificationsEnabled: settings.goalNotificationsEnabled,
        streakNotificationsEnabled: settings.streakNotificationsEnabled,
        inactivityNotificationsEnabled: settings.inactivityNotificationsEnabled,
        inactivityThresholdDays: Math.min(30, Math.max(1, settings.inactivityThresholdDays)),
      })
      setSettings(updated)
      const reminderResult = await refreshLocalReminders()
      setNotificationPermission(reminderResult.permission)
      setScheduledReminderCount(reminderResult.scheduledCount)
      setMessage(
        reminderResult.scheduledCount
          ? `Preferences saved · ${reminderResult.scheduledCount} local reminder${reminderResult.scheduledCount === 1 ? '' : 's'} scheduled.`
          : 'Preferences saved.',
      )
      setError(null)
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  async function enableLocalReminders() {
    if (!settings) return
    setIsSaving(true)
    try {
      const permission = await requestNotificationPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') {
        setError('Notification permission is not enabled. Allow it in iPhone Settings to receive reminders.')
        return
      }

      const updated = repositories.appSettings.update({ notificationsEnabled: 1 })
      setSettings(updated)
      const reminderResult = await refreshLocalReminders()
      setScheduledReminderCount(reminderResult.scheduledCount)
      setMessage(`${reminderResult.scheduledCount} local reminder${reminderResult.scheduledCount === 1 ? '' : 's'} scheduled.`)
      setError(null)
    } catch (notificationError: unknown) {
      setError(notificationError instanceof Error ? notificationError.message : 'Unable to enable notifications.')
    } finally {
      setIsSaving(false)
    }
  }

  async function exportData() {
    setIsDataBusy(true)
    try {
      const fileName = `focusflow-backup-${new Date().toISOString().slice(0, 10)}.json`
      const uri = `${FileSystem.cacheDirectory}${fileName}`
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(repositories.data.export(), null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Export FocusFlow backup',
          mimeType: 'application/json',
          UTI: 'public.json',
        })
        setMessage('Backup ready to save or share.')
      } else {
        setMessage(`Backup saved at ${uri}`)
      }
      setError(null)
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export your data.')
    } finally {
      setIsDataBusy(false)
    }
  }

  async function importData() {
    setIsDataBusy(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: 'application/json',
      })
      if (result.canceled || !result.assets[0]?.uri) return

      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      })
      Alert.alert(
        'Replace local data?',
        'Importing a backup replaces the activity history, goals, areas, and settings currently on this phone.',
        [
          { style: 'cancel', text: 'Cancel' },
          {
            onPress: () => {
              void completeImport(contents)
            },
            style: 'destructive',
            text: 'Import backup',
          },
        ],
      )
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : 'Unable to read that backup file.')
    } finally {
      setIsDataBusy(false)
    }
  }

  async function completeImport(contents: string) {
    setIsDataBusy(true)
    try {
      repositories.data.replace(JSON.parse(contents) as unknown)
      setSettings(repositories.appSettings.get())
      setActivities(repositories.activities.list())
      const reminderResult = await refreshLocalReminders()
      setNotificationPermission(reminderResult.permission)
      setScheduledReminderCount(reminderResult.scheduledCount)
      setMessage('Backup imported successfully.')
      setError(null)
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : 'That backup could not be imported.')
    } finally {
      setIsDataBusy(false)
    }
  }

  function updateActivity(
    id: number,
    key: keyof Pick<Activity, 'name' | 'color' | 'icon'>,
    value: string,
  ) {
    setActivities((current) => current.map((activity) => (
      activity.id === id ? { ...activity, [key]: value } : activity
    )))
    setMessage(null)
  }

  function saveActivity(activity: Activity) {
    try {
      const updated = repositories.activities.update(activity.id, {
        name: activity.name.trim(),
        color: activity.color,
        icon: activity.icon,
      })
      if (!updated) throw new Error('Activity area was not found.')
      setActivities((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`${updated.name} updated.`)
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update activity area.')
    }
  }

  function toggleActivity(activity: Activity) {
    try {
      const updated = repositories.activities.update(activity.id, {
        isActive: activity.isActive ? 0 : 1,
      })
      if (!updated) throw new Error('Activity area was not found.')
      setActivities((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(
        updated.isActive
          ? `${updated.name} restored for new sessions.`
          : `${updated.name} archived. Existing sessions are preserved.`,
      )
      setError(null)
    } catch (toggleError: unknown) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update activity area.')
    }
  }

  function addActivity() {
    const name = newAreaName.trim()
    if (!name) {
      setError('Enter a name for the new activity area.')
      return
    }

    try {
      const created = repositories.activities.create({
        name,
        color: newAreaColor,
        icon: 'notes',
      })
      setActivities((current) => [...current, created].sort((first, second) => first.name.localeCompare(second.name)))
      setNewAreaName('')
      setMessage(`${created.name} added.`)
      setError(null)
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : 'Unable to add activity area.')
    }
  }

  return (
    <AppScreen
      subtitle="Preferences and local activity-area controls"
      title="Settings"
    >
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {settings ? (
        <SurfaceCard title="Workspace defaults">
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            maxLength={80}
            onChangeText={(value) => updateSetting('displayName', value)}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={settings.displayName}
          />
          <Text style={styles.fieldLabel}>Default weekly focus (minutes)</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => updateSetting('defaultWeeklyTargetMinutes', Number(value) || 0)}
            style={styles.input}
            value={String(settings.defaultWeeklyTargetMinutes)}
          />
          <SettingRow
            description="Allow optional reminders from FocusFlow."
            label="Local notifications"
            onValueChange={(value) => updateSetting('notificationsEnabled', value ? 1 : 0)}
            value={Boolean(settings.notificationsEnabled)}
          />
          <View style={styles.divider} />
          <SettingRow
            description="Get a reminder when your weekly goal needs attention."
            disabled={!settings.notificationsEnabled}
            label="Goal reminders"
            onValueChange={(value) => updateSetting('goalNotificationsEnabled', value ? 1 : 0)}
            value={Boolean(settings.goalNotificationsEnabled)}
          />
          <View style={styles.divider} />
          <SettingRow
            description="Celebrate consecutive active-day milestones."
            disabled={!settings.notificationsEnabled}
            label="Streak milestones"
            onValueChange={(value) => updateSetting('streakNotificationsEnabled', value ? 1 : 0)}
            value={Boolean(settings.streakNotificationsEnabled)}
          />
          <View style={styles.divider} />
          <SettingRow
            description="Remind you after several days without a focus session."
            disabled={!settings.notificationsEnabled}
            label="Inactivity reminders"
            onValueChange={(value) => updateSetting('inactivityNotificationsEnabled', value ? 1 : 0)}
            value={Boolean(settings.inactivityNotificationsEnabled)}
          />
          <View style={styles.thresholdRow}>
            <Text style={styles.settingDescription}>Remind me after</Text>
            <TextInput
              accessibilityLabel="Inactivity threshold in days"
              editable={Boolean(settings.notificationsEnabled && settings.inactivityNotificationsEnabled)}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => updateSetting('inactivityThresholdDays', Number(value) || 1)}
              style={styles.thresholdInput}
              value={String(settings.inactivityThresholdDays)}
            />
            <Text style={styles.settingDescription}>days</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => { void saveSettings() }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>{isSaving ? 'Saving…' : 'Save preferences'}</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        description="Rename areas, change their icon or color, and add new local areas for future sessions."
        title="Activity areas"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isActivityAreasExpanded }}
          onPress={() => setIsActivityAreasExpanded((expanded) => !expanded)}
          style={({ pressed }) => [styles.activityAreasToggle, pressed && styles.pressed]}
        >
          <Text style={styles.activityAreasToggleText}>
            {isActivityAreasExpanded ? 'Hide activity areas' : `Show ${activities.length} areas`}
          </Text>
          <Ionicons
            color={colors.accent}
            name={isActivityAreasExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
          />
        </Pressable>
        {isActivityAreasExpanded ? (
          <>
            <View style={styles.activityList}>
              {activities.map((activity) => (
                <ActivityAreaRow
                  activity={activity}
                  key={activity.id}
                  onChange={updateActivity}
                  onSave={saveActivity}
                  onToggleActive={toggleActivity}
                />
              ))}
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Add an activity area</Text>
            <TextInput
              onChangeText={setNewAreaName}
              placeholder="e.g. Algorithms"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={newAreaName}
            />
            <ColorChoices selectedColor={newAreaColor} onSelect={setNewAreaColor} />
            <Pressable
              accessibilityRole="button"
              onPress={addActivity}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Add activity area</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.activityAreasSummary}>
            {activities.length} area{activities.length === 1 ? '' : 's'} configured.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard title="Notifications">
        <Text style={styles.body}>
          Reminders are scheduled on this phone and never sent through a server.
        </Text>
        <View style={styles.notificationStatus}>
          <Text style={styles.sectionLabel}>System permission</Text>
          <Text style={styles.notificationPermission}>{permissionLabel(notificationPermission)}</Text>
        </View>
        <Text style={styles.body}>
          {scheduledReminderCount
            ? `${scheduledReminderCount} reminder${scheduledReminderCount === 1 ? '' : 's'} currently scheduled.`
            : 'Save your preferences or enable reminders to schedule local nudges.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => { void enableLocalReminders() }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>
            {notificationPermission === 'granted' ? 'Refresh local reminders' : 'Allow local reminders'}
          </Text>
        </Pressable>
      </SurfaceCard>

      <SurfaceCard
        description="Backups are compatible with FocusFlow web exports and stay under your control."
        title="Data"
      >
        <Text style={styles.body}>
          Export a JSON backup to Files or another app. Importing replaces the local database after confirmation.
        </Text>
        <View style={styles.dataActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isDataBusy}
            onPress={() => { void exportData() }}
            style={({ pressed }) => [styles.secondaryButton, styles.dataButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>{isDataBusy ? 'Working…' : 'Export JSON backup'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isDataBusy}
            onPress={() => { void importData() }}
            style={({ pressed }) => [styles.secondaryButton, styles.dataButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Import JSON backup</Text>
          </Pressable>
        </View>
      </SurfaceCard>

      <View style={styles.version}>
        <Text style={styles.versionText}>FocusFlow Mobile · local-first</Text>
      </View>
    </AppScreen>
  )
}

function permissionLabel(permission: NotificationPermission) {
  if (permission === 'granted') return 'Allowed'
  if (permission === 'denied') return 'Not allowed'
  return 'Not requested'
}

const styles = StyleSheet.create({
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  disabledRow: {
    opacity: 0.55,
  },
  settingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  settingLabel: {
    ...typography.label,
    color: colors.text,
  },
  settingDescription: {
    ...typography.body,
    color: colors.textMuted,
  },
  thresholdRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thresholdInput: {
    ...typography.body,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minWidth: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageText: {
    ...typography.label,
    color: colors.success,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  notificationStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationPermission: {
    ...typography.label,
    color: colors.success,
  },
  dataActions: {
    gap: spacing.sm,
  },
  dataButton: {
    flex: 1,
  },
  activityList: {
    gap: spacing.xl,
  },
  activityAreasToggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  activityAreasToggleText: {
    ...typography.label,
    color: colors.accent,
  },
  activityAreasSummary: {
    ...typography.body,
    color: colors.textMuted,
  },
  areaRow: {
    gap: spacing.md,
  },
  archivedAreaRow: {
    opacity: 0.58,
  },
  areaActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  areaHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  areaDot: {
    borderRadius: radii.pill,
    height: 12,
    width: 12,
  },
  areaNameInput: {
    ...typography.body,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  smallChoice: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  smallChoiceSelected: {
    borderColor: colors.accent,
  },
  smallChoiceText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  colorChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChoice: {
    borderColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  selectedColorChoice: {
    borderColor: colors.text,
  },
  saveAreaButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  saveAreaText: {
    ...typography.label,
    color: colors.accent,
  },
  archiveAreaButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  archiveAreaText: {
    ...typography.label,
    color: colors.warning,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.accent,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  version: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    ...typography.label,
    color: colors.textSubtle,
  },
})
