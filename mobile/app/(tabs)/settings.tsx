import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'

function SettingRow({
  description,
  label,
  value,
  onValueChange,
}: {
  description: string
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        onValueChange={onValueChange}
        thumbColor={value ? colors.accent : colors.textMuted}
        trackColor={{ false: colors.surfaceRaised, true: colors.accentPressed }}
        value={value}
      />
    </View>
  )
}

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [goalRemindersEnabled, setGoalRemindersEnabled] = useState(false)

  return (
    <AppScreen
      subtitle="Preferences and local data controls"
      title="Settings"
    >
      <SurfaceCard title="Notifications">
        <SettingRow
          description="Allow optional reminders from FocusFlow."
          label="Local notifications"
          onValueChange={setNotificationsEnabled}
          value={notificationsEnabled}
        />
        <View style={styles.divider} />
        <SettingRow
          description="Get a reminder when your weekly goal needs attention."
          label="Goal reminders"
          onValueChange={setGoalRemindersEnabled}
          value={goalRemindersEnabled}
        />
      </SurfaceCard>

      <SurfaceCard
        description="Your activity data will be stored in the app's on-device SQLite database. Export and import controls will be added with the data layer."
        title="Data"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => undefined}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Export local data</Text>
        </Pressable>
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
  version: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    ...typography.label,
    color: colors.textSubtle,
  },
})
