import { StyleSheet, Text, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { colors, spacing, typography } from '../../src/theme/tokens'

const insightItems = [
  {
    label: 'Most consistent area',
    value: '—',
    detail: 'Log a few sessions to see your strongest focus area.',
  },
  {
    label: 'Best focus day',
    value: '—',
    detail: 'Your most productive day will be surfaced here.',
  },
  {
    label: 'Average session',
    value: '0m',
    detail: 'Averages are calculated locally from your sessions.',
  },
]

export default function InsightsScreen() {
  return (
    <AppScreen
      subtitle="Patterns from your local activity history"
      title="Insights"
    >
      <SurfaceCard
        description="FocusFlow keeps this analysis on your device. Insights will become more useful as your history grows."
        title="Your focus pattern"
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateValue}>Ready when you are</Text>
          <Text style={styles.emptyStateText}>
            Start by logging a session from the Overview tab.
          </Text>
        </View>
      </SurfaceCard>

      <View style={styles.insightList}>
        {insightItems.map((item) => (
          <View key={item.label} style={styles.insightRow}>
            <View style={styles.insightCopy}>
              <Text style={styles.insightLabel}>{item.label}</Text>
              <Text style={styles.insightDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.insightValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: spacing.lg,
  },
  emptyStateValue: {
    ...typography.title,
    color: colors.accent,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  insightList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  insightRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  insightLabel: {
    ...typography.label,
    color: colors.text,
  },
  insightDetail: {
    ...typography.body,
    color: colors.textMuted,
  },
  insightValue: {
    ...typography.title,
    color: colors.accent,
  },
})
