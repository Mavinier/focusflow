import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'

import { ACTIVITY_COLOR_PALETTE } from '../../src/data/activityColors'
import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { repositories } from '../../src/db/repositories'
import type { Activity } from '../../src/db/schema'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'
import type { ActivityIconName } from '../../src/types/tracker'

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
]

function ActivityAreaRow({
  activity,
  onChange,
  onSave,
}: {
  activity: Activity
  onChange: (
    id: number,
    key: keyof Pick<Activity, 'name' | 'color' | 'icon'>,
    value: string,
  ) => void
  onSave: (activity: Activity) => void
}) {
  return (
    <View style={styles.areaRow}>
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
      <Pressable
        accessibilityLabel={`Save ${activity.name}`}
        accessibilityRole="button"
        onPress={() => onSave(activity)}
        style={styles.saveAreaButton}
      >
        <Text style={styles.saveAreaText}>Save area</Text>
      </Pressable>
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

  useFocusEffect(
    useCallback(() => {
      try {
        setSettings(repositories.appSettings.get())
        setActivities(repositories.activities.list())
        setError(null)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
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

  function saveSettings() {
    if (!settings) return
    try {
      const updated = repositories.appSettings.update({
        displayName: settings.displayName.trim() || 'FocusFlow',
        defaultWeeklyTargetMinutes: Math.max(0, settings.defaultWeeklyTargetMinutes),
        weekStartsOn: settings.weekStartsOn,
        theme: settings.theme,
        notificationsEnabled: settings.notificationsEnabled,
        goalNotificationsEnabled: settings.goalNotificationsEnabled,
        streakNotificationsEnabled: settings.streakNotificationsEnabled,
        inactivityNotificationsEnabled: settings.inactivityNotificationsEnabled,
        inactivityThresholdDays: Math.max(1, settings.inactivityThresholdDays),
      })
      setSettings(updated)
      setMessage('Preferences saved.')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
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
          <Pressable
            accessibilityRole="button"
            onPress={saveSettings}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Save preferences</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        description="Rename areas, change their icon or color, and add new local areas for future sessions."
        title="Activity areas"
      >
        <View style={styles.activityList}>
          {activities.map((activity) => (
            <ActivityAreaRow
              activity={activity}
              key={activity.id}
              onChange={updateActivity}
              onSave={saveActivity}
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
      </SurfaceCard>

      <SurfaceCard title="Notifications">
        <Text style={styles.body}>
          Notification scheduling is local-only. Save preferences above to keep
          these choices in the on-device database.
        </Text>
      </SurfaceCard>

      <SurfaceCard
        description="Your activity data is stored in the app's on-device SQLite database."
        title="Data"
      >
        <Text style={styles.body}>Focus sessions and areas stay on this device.</Text>
      </SurfaceCard>

      <View style={styles.version}>
        <Text style={styles.versionText}>FocusFlow Mobile · local-first</Text>
      </View>
    </AppScreen>
  )
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
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  activityList: {
    gap: spacing.xl,
  },
  areaRow: {
    gap: spacing.md,
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
