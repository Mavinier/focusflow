import { useFocusEffect, router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ActivityHeatmap } from '../../src/components/ActivityHeatmap'
import { AppScreen } from '../../src/components/AppScreen'
import { DayDetail } from '../../src/components/DayDetail'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { repositories } from '../../src/db/repositories'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'
import type { DayData } from '../../src/types/tracker'
import {
  buildFocusMix,
  calculateActiveStreak,
  totalMinutesThrough,
} from '../../src/utils/analytics'
import { sessionsToDayData } from '../../src/utils/insights'
import {
  formatDayHeading,
  formatDuration,
  getTodayDateKey,
  getWeekStart,
} from '../../src/utils/tracker'

export default function OverviewScreen() {
  const today = getTodayDateKey()
  const currentYear = Number(today.slice(0, 4))
  const [dayData, setDayData] = useState<DayData>({})
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [useRollingHeatmap, setUseRollingHeatmap] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      try {
        setIsLoading(true)
        const sessions = repositories.focusSessions.listWithActivities()
        const notes = repositories.dailyNotes.listBetween('0000-01-01', '9999-12-31')
        setDayData(sessionsToDayData(sessions, notes))
        setError(null)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load activity data.')
      } finally {
        setIsLoading(false)
      }
    }, []),
  )

  const availableYears = useMemo(() => {
    const years = Object.keys(dayData).map((date) => Number(date.slice(0, 4)))
    return Array.from(new Set([currentYear, selectedYear, ...years]))
      .sort((first, second) => second - first)
  }, [currentYear, dayData, selectedYear])
  const periodEnd = selectedYear === currentYear ? today : `${selectedYear}-12-31`
  const visibleDayData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(dayData).filter(
          ([date]) => date >= `${selectedYear}-01-01` && date <= periodEnd,
        ),
      ) as DayData,
    [dayData, periodEnd, selectedYear],
  )
  const focusMix = useMemo(() => buildFocusMix(visibleDayData), [visibleDayData])
  const totalTrackedMinutes = totalMinutesThrough(visibleDayData, periodEnd)
  const activeDaysCount = Object.values(visibleDayData).filter(
    (record) => record.totalMinutes > 0,
  ).length
  const currentStreak = calculateActiveStreak(dayData)
  const weekStart = getWeekStart(today)
  const weekMinutes = Object.values(dayData)
    .filter((record) => record.date >= weekStart && record.date <= today)
    .reduce((total, record) => total + record.totalMinutes, 0)
  const selectedRecord = dayData[selectedDate]

  function handleYearChange(year: number) {
    setSelectedYear(year)
    setUseRollingHeatmap(false)
    setSelectedDate(year === currentYear ? today : `${year}-12-31`)
  }

  return (
    <AppScreen
      subtitle={`${formatDayHeading(selectedDate)} · Your local study space`}
      title="Your focus, in motion."
    >
      {isLoading ? <Text style={styles.statusText}>Loading your local activity…</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/log-activity', params: { date: selectedDate } })}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>+ Log activity</Text>
        <Text style={styles.primaryButtonHint}>Capture a focus session</Text>
      </Pressable>

      <View style={styles.metricsRow}>
        <Metric label="This week" value={formatDuration(weekMinutes)} />
        <Metric label="Active days" value={String(activeDaysCount)} />
        <Metric label="Current streak" value={`${currentStreak}d`} />
      </View>

      <ActivityHeatmap
        availableYears={availableYears}
        dayData={useRollingHeatmap && selectedYear === currentYear ? dayData : visibleDayData}
        onModeChange={setUseRollingHeatmap}
        onSelectDate={setSelectedDate}
        onYearChange={handleYearChange}
        selectedDate={selectedDate}
        useRollingWindow={useRollingHeatmap}
        year={selectedYear}
      />

      <DayDetail
        onAddEntry={() => router.push({ pathname: '/log-activity', params: { date: selectedDate } })}
        selectedDate={selectedDate}
        selectedRecord={selectedRecord}
      />

      <SurfaceCard
        description={
          totalTrackedMinutes
            ? `${formatDuration(totalTrackedMinutes)} tracked in ${selectedYear}.`
            : 'Focus areas will be summarized after your first session.'
        }
        title="Focus mix"
      >
        {focusMix.length ? (
          focusMix.slice(0, 5).map((activity) => (
            <View key={activity.name} style={styles.mixRow}>
              <View style={styles.mixLabel}>
                <View style={[styles.pillDot, { backgroundColor: activity.color }]} />
                <Text style={styles.pillText}>{activity.name}</Text>
              </View>
              <Text style={styles.mixValue}>
                {activity.percentage}% · {formatDuration(activity.durationMinutes)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Log a session to see where your focus is going.</Text>
        )}
      </SurfaceCard>
    </AppScreen>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  statusText: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
    marginBottom: spacing.md,
  },
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
  mixRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mixLabel: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
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
  mixValue: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 11,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
})
