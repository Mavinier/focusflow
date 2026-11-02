import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { ActivityIconName, DayRecord } from '../types/tracker'
import {
  formatDayHeading,
  formatDuration,
  getCategoryLabel,
  getIntensity,
} from '../utils/tracker'
import { colors, radii, spacing, typography } from '../theme/tokens'
import { SurfaceCard } from './SurfaceCard'

type DayDetailProps = {
  onAddEntry: () => void
  selectedDate: string
  selectedRecord?: DayRecord
}

const iconNames: Record<ActivityIconName, keyof typeof Ionicons.glyphMap> = {
  code: 'code-slash-outline',
  database: 'server-outline',
  book: 'book-outline',
  work: 'briefcase-outline',
  notes: 'document-text-outline',
  fitness: 'fitness-outline',
  design: 'color-palette-outline',
  language: 'language-outline',
  music: 'musical-notes-outline',
  personal: 'person-outline',
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

export function DayDetail({ onAddEntry, selectedDate, selectedRecord }: DayDetailProps) {
  const activities = selectedRecord?.activities ?? []
  const totalMinutes = selectedRecord?.totalMinutes ?? 0
  const maxDuration = Math.max(...activities.map((activity) => activity.duration), 1)
  const mostFocused = activities.reduce(
    (current, activity) => (
      !current || activity.duration > current.duration ? activity : current
    ),
    activities[0],
  )

  return (
    <SurfaceCard title="Selected day">
      <Text style={styles.heading}>{formatDayHeading(selectedDate)}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: intensityColor(getIntensity(totalMinutes)) }]} />
        <Text style={styles.statusText}>{getCategoryLabel(totalMinutes)}</Text>
      </View>

      <View style={styles.totalBlock}>
        <Text style={styles.total}>{formatDuration(totalMinutes)}</Text>
        <Text style={styles.totalLabel}>focused time</Text>
      </View>

      <View style={styles.noteBlock}>
        <Ionicons color={colors.textSubtle} name="document-text-outline" size={16} />
        <Text style={styles.noteText}>{getDayMessage(totalMinutes, selectedRecord?.note)}</Text>
      </View>

      <View style={styles.breakdownHeader}>
        <View>
          <Text style={styles.sectionLabel}>Focus breakdown</Text>
          <Text style={styles.breakdownTitle}>
            {activities.length ? `${activities.length} areas` : 'No entries yet'}
          </Text>
        </View>
        {activities.length ? <Text style={styles.breakdownTotal}>{formatDuration(totalMinutes)}</Text> : null}
      </View>

      {activities.length ? (
        <View style={styles.activityList}>
          {activities.map((activity) => (
            <View key={activity.name} style={styles.activityRow}>
              <View style={styles.activityTopRow}>
                <View style={styles.activityName}>
                  <View style={[styles.activityIcon, { backgroundColor: `${activity.color}24` }]}>
                    <Ionicons color={activity.color} name={iconNames[activity.icon]} size={16} />
                  </View>
                  <Text style={styles.activityLabel}>{activity.name}</Text>
                </View>
                <Text style={styles.activityDuration}>{formatDuration(activity.duration)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: activity.color,
                      width: `${(activity.duration / maxDuration) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyDay}>
          <Ionicons color={colors.textSubtle} name="journal-outline" size={20} />
          <Text style={styles.emptyTitle}>No activities logged for this day.</Text>
          <Text style={styles.emptyText}>Add a focus session to start building this day.</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onAddEntry}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <Ionicons color={colors.accentText} name="add" size={18} />
        <Text style={styles.addButtonText}>Add another entry</Text>
      </Pressable>

      {mostFocused ? (
        <View style={styles.tip}>
          <Ionicons color={colors.success} name="checkmark-circle-outline" size={16} />
          <Text style={styles.tipText}>
            Most time went to <Text style={styles.tipStrong}>{mostFocused.name}</Text>
          </Text>
        </View>
      ) : null}
    </SurfaceCard>
  )
}

function intensityColor(intensity: ReturnType<typeof getIntensity>) {
  switch (intensity) {
    case 'none':
      return colors.textSubtle
    case 'low':
      return colors.warning
    case 'medium':
      return colors.info
    case 'high':
    case 'very-high':
      return colors.accent
  }
}

const styles = StyleSheet.create({
  heading: {
    ...typography.title,
    color: colors.text,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  statusText: {
    ...typography.label,
    color: colors.textMuted,
  },
  totalBlock: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  total: {
    ...typography.display,
    color: colors.text,
  },
  totalLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  noteBlock: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteText: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  breakdownHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  breakdownTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  breakdownTotal: {
    ...typography.label,
    color: colors.textMuted,
  },
  activityList: {
    gap: spacing.lg,
  },
  activityRow: {
    gap: spacing.sm,
  },
  activityTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityName: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activityIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  activityLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  activityDuration: {
    ...typography.label,
    color: colors.textMuted,
  },
  progressTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radii.pill,
    height: '100%',
  },
  emptyDay: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.label,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
  addButtonText: {
    ...typography.label,
    color: colors.accentText,
  },
  tip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tipStrong: {
    color: colors.text,
  },
})
