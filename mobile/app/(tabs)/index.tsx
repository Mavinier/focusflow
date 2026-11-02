import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'

const activityPills = [
  { label: 'Java', color: colors.activity.java },
  { label: 'SQL', color: colors.activity.sql },
  { label: 'Reading', color: colors.activity.reading },
]

const heatmapCells = Array.from({ length: 35 }, (_, index) => {
  if (index < 3) return colors.activity.java
  if (index < 7) return colors.surfaceRaised
  if (index === 16) return colors.activity.sql
  if (index === 24) return colors.activity.reading
  return colors.border
})

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

export default function OverviewScreen() {
  const dateLabel = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <AppScreen
      subtitle={`${dateLabel} · Your local study space`}
      title="Good morning"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/log-activity')}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>+ Log activity</Text>
        <Text style={styles.primaryButtonHint}>Capture a focus session</Text>
      </Pressable>

      <View style={styles.metricsRow}>
        <Metric label="This week" value="0m" />
        <Metric label="Active days" value="0" />
        <Metric label="Current streak" value="0d" />
      </View>

      <SurfaceCard
        description="Your activity history will appear here as you log sessions."
        title="Activity map"
      >
        <View accessibilityLabel="Empty activity heatmap" style={styles.heatmap}>
          {heatmapCells.map((color, index) => (
            <View key={`cell-${index}`} style={[styles.heatmapCell, { backgroundColor: color }]} />
          ))}
        </View>
        <View style={styles.heatmapLegend}>
          <Text style={styles.legendText}>Less</Text>
          {[colors.border, colors.surfaceRaised, colors.activity.sql, colors.activity.java].map(
            (color, index) => (
              <View key={`legend-${index}`} style={[styles.legendCell, { backgroundColor: color }]} />
            ),
          )}
          <Text style={styles.legendText}>More</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard
        description="Focus areas will be summarized after your first session."
        title="Focus mix"
      >
        <View style={styles.pillRow}>
          {activityPills.map((activity) => (
            <View key={activity.label} style={styles.activityPill}>
              <View style={[styles.pillDot, { backgroundColor: activity.color }]} />
              <Text style={styles.pillText}>{activity.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </SurfaceCard>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    minHeight: 68,
    padding: spacing.md,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    ...typography.title,
    color: colors.accentText,
  },
  primaryButtonHint: {
    ...typography.label,
    color: colors.accentText,
    marginTop: spacing.xs,
    opacity: 0.72,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  metricValue: {
    ...typography.title,
    color: colors.text,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heatmapCell: {
    borderRadius: 3,
    height: 17,
    width: 17,
  },
  heatmapLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  legendCell: {
    borderRadius: 3,
    height: 12,
    width: 12,
  },
  legendText: {
    ...typography.label,
    color: colors.textSubtle,
    fontSize: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  pillText: {
    ...typography.label,
    color: colors.text,
  },
  progressTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: '100%',
    width: '0%',
  },
})
