import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import type { DailyNoteRow, FocusSessionRow } from '../../src/types/analytics'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'
import {
  buildHighlights,
  buildTrend,
  calculateLongestStreak,
  countDaysInRange,
  getPeriodRange,
  goalCompletionRate,
  hourHistogram,
  longestSessions,
  mixFromSessions,
  neglectedAreas,
  plannedVsActual,
  recentNotes,
  sessionsToDayData,
  sliceSessions,
  streakFromSessions,
  topDays,
  totalMinutes,
  weekdayBaseline,
  weekdayDistribution,
  type InsightPeriod,
} from '../../src/utils/insights'
import { formatDuration, formatShortDate, getTodayDateKey } from '../../src/utils/tracker'
import { repositories } from '../../src/db/repositories'

const PERIODS: { id: InsightPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

export default function InsightsScreen() {
  const today = getTodayDateKey()
  const currentYear = Number(today.slice(0, 4))
  const [period, setPeriod] = useState<InsightPeriod>('year')
  const [showChartScale, setShowChartScale] = useState(true)
  const [isPlanExpanded, setIsPlanExpanded] = useState(false)
  const [sessions, setSessions] = useState<FocusSessionRow[]>([])
  const [notes, setNotes] = useState<DailyNoteRow[]>([])
  const [goals, setGoals] = useState(repositories.weeklyGoals.list())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      try {
        setIsLoading(true)
        setSessions(repositories.focusSessions.listWithActivities())
        setNotes(repositories.dailyNotes.listBetween('0000-01-01', '9999-12-31'))
        setGoals(repositories.weeklyGoals.list())
        setError(null)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load insights.')
      } finally {
        setIsLoading(false)
      }
    }, []),
  )

  const range = useMemo(() => getPeriodRange(period, today), [period, today])
  const periodSessions = useMemo(
    () => sliceSessions(sessions, range.from, range.to),
    [range, sessions],
  )
  const yearSessions = useMemo(
    () => sliceSessions(sessions, `${currentYear}-01-01`, today),
    [currentYear, sessions, today],
  )
  const mix = useMemo(() => mixFromSessions(periodSessions), [periodSessions])
  const trend = useMemo(
    () => buildTrend(periodSessions, period, today),
    [period, periodSessions, today],
  )
  const productiveDays = useMemo(() => topDays(periodSessions), [periodSessions])
  const hours = useMemo(() => hourHistogram(periodSessions), [periodSessions])
  const weekdays = useMemo(
    () => period === 'week'
      ? weekdayBaseline(yearSessions, `${currentYear}-01-01`, today)
      : weekdayDistribution(periodSessions),
    [currentYear, period, periodSessions, today, yearSessions],
  )
  const weeks = useMemo(
    () => plannedVsActual(periodSessions, goals, range.from, range.to),
    [goals, periodSessions, range],
  )
  const yearDayData = useMemo(
    () => sessionsToDayData(yearSessions, notes),
    [notes, yearSessions],
  )
  const currentStreak = streakFromSessions(sessions)
  const periodStreak = streakFromSessions(periodSessions)
  const longestStreak = calculateLongestStreak(yearDayData)
  const neglected = useMemo(
    () => neglectedAreas(yearSessions, periodSessions),
    [periodSessions, yearSessions],
  )
  const longSessions = useMemo(() => longestSessions(periodSessions), [periodSessions])
  const notesList = useMemo(
    () => recentNotes(
      notes.filter((note) => note.activityDate >= range.from && note.activityDate <= range.to),
      periodSessions,
      5,
    ),
    [notes, periodSessions, range],
  )
  const highlights = useMemo(
    () => buildHighlights(
      currentStreak || periodStreak,
      longestStreak,
      longSessions[0],
      weeks[weeks.length - 1],
    ),
    [currentStreak, longestStreak, longSessions, periodStreak, weeks],
  )
  const trackedMinutes = totalMinutes(periodSessions)
  const activeDaysCount = new Set(periodSessions.map((session) => session.activityDate)).size
  const dayCount = countDaysInRange(range.from, range.to)
  const activeRatio = Math.round((activeDaysCount / dayCount) * 1000) / 10

  return (
    <AppScreen
      subtitle="Trends, mix, and consistency from your local sessions."
      title="Where your attention went."
    >
      <View style={styles.periodHeader}>
        <View style={styles.periodToggle}>
          {PERIODS.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: period === option.id }}
              key={option.id}
              onPress={() => setPeriod(option.id)}
              style={[styles.periodButton, period === option.id && styles.periodButtonSelected]}
            >
              <Text style={[styles.periodButtonText, period === option.id && styles.periodButtonTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.scaleToggle}>
          <Text style={styles.scaleLabel}>Scale</Text>
          <Switch
            accessibilityLabel="Show chart scale"
            onValueChange={setShowChartScale}
            thumbColor={showChartScale ? colors.accent : colors.textMuted}
            trackColor={{ false: colors.surfaceRaised, true: colors.accentPressed }}
            value={showChartScale}
          />
        </View>
      </View>

      {isLoading ? <Text style={styles.statusText}>Loading insights…</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <SummaryStat label="Time in period" value={formatDuration(trackedMinutes)} detail={`${formatShortDate(range.from)} – ${formatShortDate(range.to)}`} />
        <SummaryStat label="Active days" value={`${activeDaysCount} / ${dayCount}`} detail={`${activeRatio}% of days had focus`} />
        <SummaryStat label="Top activity" value={mix[0]?.name ?? '—'} detail={mix[0] ? formatDuration(mix[0].durationMinutes) : 'No activity yet'} />
        <SummaryStat label="Goal completion" value={`${goalCompletionRate(weeks)}%`} detail={`${weeks.filter((week) => week.met).length} of ${weeks.length} weeks met`} />
      </View>

      <SurfaceCard description="Minutes grouped by activity area." title="Focus mix">
        <BarList
          empty="No activity recorded in this period."
          items={mix.map((activity) => ({
            color: activity.color,
            hint: `${activity.percentage}%`,
            key: activity.name,
            label: activity.name,
            minutes: activity.durationMinutes,
            value: formatDuration(activity.durationMinutes),
          }))}
        />
      </SurfaceCard>

      <SurfaceCard
        description={period === 'week'
          ? `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`
          : `Total focus in the selected ${period}.`}
        title={period === 'week' ? 'Daily focus' : period === 'month' ? 'Weekly focus' : 'Monthly focus'}
      >
        <BarChart
          empty="No trend data yet."
          items={trend.map((point) => ({
            key: point.key,
            label: point.label,
            minutes: point.minutes,
            value: formatDuration(point.minutes),
          }))}
          showScale={showChartScale}
        />
      </SurfaceCard>

      <View style={styles.twoColumn}>
        <SurfaceCard title="Most productive days">
          <BarList
            empty="No productive days yet."
            items={productiveDays.map((day) => ({
              key: day.date,
              label: day.label,
              minutes: day.minutes,
              value: formatDuration(day.minutes),
            }))}
          />
        </SurfaceCard>
        <SurfaceCard title="Most productive hours">
          <BarChart
            empty="Session times are not available."
            items={hours.map((bucket) => ({
              key: String(bucket.hour),
              label: bucket.axisLabel,
              minutes: bucket.minutes,
              value: formatDuration(bucket.minutes),
            }))}
            showScale={showChartScale}
          />
        </SurfaceCard>
      </View>

      <View style={styles.twoColumn}>
        <SurfaceCard
          description={period === 'week' ? `Average per day across ${currentYear}.` : 'Total focus in the selected period.'}
          title={period === 'week' ? 'Typical weekday rhythm' : 'Focus by weekday'}
        >
          <BarChart
            empty="No weekday data yet."
            items={weekdays.map((day) => ({
              key: day.label,
              label: day.label,
              minutes: day.minutes,
              value: formatDuration(day.minutes),
            }))}
            showScale={showChartScale}
          />
        </SurfaceCard>
        <SurfaceCard description="Actual minutes compared with each weekly target." title="Planned vs actual">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isPlanExpanded }}
            disabled={!weeks.length}
            onPress={() => setIsPlanExpanded((expanded) => !expanded)}
            style={({ pressed }) => [
              styles.planToggle,
              !weeks.length && styles.planToggleDisabled,
              pressed && styles.planTogglePressed,
            ]}
          >
            <Text style={styles.planToggleText}>
              {weeks.length
                ? isPlanExpanded ? 'Hide weekly history' : `Show ${weeks.length} weeks`
                : 'No weeks in this period'}
            </Text>
            {weeks.length ? (
              <Ionicons
                color={colors.accent}
                name={isPlanExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
              />
            ) : null}
          </Pressable>
          {isPlanExpanded && weeks.length ? (
            <View style={styles.planList}>
              {weeks.slice(-8).reverse().map((week) => <PlanRow key={week.weekStart} week={week} />)}
            </View>
          ) : (
            <Text style={styles.planSummary}>
              {weeks.length
                ? `${weeks.filter((week) => week.met).length} of ${weeks.length} weekly targets reached.`
                : 'No weeks in this period.'}
            </Text>
          )}
        </SurfaceCard>
      </View>

      <View style={styles.twoColumn}>
        <SurfaceCard title="Streaks and coverage">
          <InsightRow label="Current streak" value={`${currentStreak || periodStreak} days`} />
          <InsightRow label="Longest streak" value={`${longestStreak} days`} />
          <InsightRow label="Active-day ratio" value={`${activeRatio}%`} />
        </SurfaceCard>
        <SurfaceCard title="Areas getting less time">
          <BarList
            empty="Every activity is getting attention."
            items={neglected.map((area) => ({
              color: area.color,
              hint: `${formatDuration(area.yearMinutes)} this year`,
              key: area.name,
              label: area.name,
              minutes: area.periodMinutes,
              value: formatDuration(area.periodMinutes),
            }))}
          />
        </SurfaceCard>
      </View>

      <View style={styles.twoColumn}>
        <SurfaceCard title="Longest focus blocks">
          {longSessions.length ? longSessions.map((session, index) => (
            <View key={`${session.activityDate}-${session.activityName}-${index}`} style={styles.listRow}>
              <View style={[styles.colorDot, { backgroundColor: session.color }]} />
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{session.activityName}</Text>
                <Text style={styles.listDetail}>{formatShortDate(session.activityDate)}</Text>
              </View>
              <Text style={styles.listValue}>{formatDuration(session.durationMinutes)}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No sessions in this period.</Text>}
        </SurfaceCard>
        <SurfaceCard title="Recent notes">
          {notesList.length ? notesList.map((item) => (
            <View key={`${item.date}-${item.note}`} style={styles.noteRow}>
              <Text style={styles.noteDate}>{formatShortDate(item.date)}</Text>
              <Text style={styles.noteText}>{item.note}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No notes in this period.</Text>}
        </SurfaceCard>
      </View>

      <SurfaceCard description="Derived from your local activity history." title="Highlights">
        {highlights.map((item) => (
          <View key={item.title} style={styles.highlightRow}>
            <Text style={styles.highlightTitle}>{item.title}</Text>
            <Text style={styles.highlightDetail}>{item.detail}</Text>
          </View>
        ))}
      </SurfaceCard>
    </AppScreen>
  )
}

function SummaryStat({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.summaryDetail}>{detail}</Text>
    </View>
  )
}

function BarList({
  empty,
  items,
}: {
  empty: string
  items: { color?: string; hint?: string; key: string; label: string; minutes: number; value: string }[]
}) {
  if (!items.length) return <Text style={styles.emptyText}>{empty}</Text>
  const max = Math.max(...items.map((item) => item.minutes), 1)

  return (
    <View style={styles.barList}>
      {items.map((item) => (
        <View key={item.key} style={styles.barRow}>
          <View style={styles.barLabel}>
            {item.color ? <View style={[styles.colorDot, { backgroundColor: item.color }]} /> : null}
            <Text numberOfLines={1} style={styles.barLabelText}>{item.label}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: item.color ?? colors.accent, width: `${(item.minutes / max) * 100}%` }]} />
          </View>
          <View style={styles.barValue}>
            <Text style={styles.barValueText}>{item.value}</Text>
            {item.hint ? <Text style={styles.barHint}>{item.hint}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}

function BarChart({
  empty,
  items,
  showScale,
}: {
  empty: string
  items: { key: string; label: string; minutes: number; value: string }[]
  showScale: boolean
}) {
  if (!items.length) return <Text style={styles.emptyText}>{empty}</Text>
  const max = Math.max(...items.map((item) => item.minutes), 1)

  return (
    <View>
      {showScale ? <Text style={styles.chartScale}>{formatDuration(max)} max</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartRow}>
          {items.map((item) => (
            <View key={item.key} style={styles.chartColumn}>
              <View style={styles.chartBarSlot}>
                <View style={[styles.chartBar, { height: `${item.minutes ? Math.max((item.minutes / max) * 100, 4) : 0}%` }]} />
              </View>
              <Text numberOfLines={1} style={styles.chartLabel}>{item.label}</Text>
              <Text style={styles.chartValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

function PlanRow({ week }: { week: { actualMinutes: number; label: string; targetMinutes: number; met: boolean } }) {
  const max = Math.max(week.actualMinutes, week.targetMinutes, 1)
  return (
    <View style={styles.planRow}>
      <View style={styles.planHeader}>
        <Text style={styles.planLabel}>{week.label}</Text>
        <Text style={[styles.planStatus, week.met && styles.planStatusMet]}>{week.met ? 'Goal met' : 'Below target'}</Text>
      </View>
      <View style={styles.planTrack}>
        <View style={[styles.planActual, { width: `${(week.actualMinutes / max) * 100}%` }]} />
        <View style={[styles.planTarget, { left: `${(week.targetMinutes / max) * 100}%` }]} />
      </View>
      <Text style={styles.planValue}>{formatDuration(week.actualMinutes)} / {formatDuration(week.targetMinutes)}</Text>
    </View>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  periodHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodToggle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  periodButton: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  periodButtonSelected: {
    backgroundColor: colors.accent,
  },
  periodButtonText: {
    ...typography.label,
    color: colors.textMuted,
  },
  periodButtonTextSelected: {
    color: colors.accentText,
  },
  scaleToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scaleLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  statusText: {
    ...typography.label,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 140,
    padding: spacing.md,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  summaryValue: {
    ...typography.title,
    color: colors.text,
  },
  summaryDetail: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  twoColumn: {
    gap: spacing.lg,
  },
  barList: {
    gap: spacing.md,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  barLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    width: 92,
  },
  barLabelText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  colorDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  barTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radii.pill,
    height: '100%',
  },
  barValue: {
    alignItems: 'flex-end',
    width: 54,
  },
  barValueText: {
    ...typography.label,
    color: colors.text,
    fontSize: 10,
  },
  barHint: {
    ...typography.label,
    color: colors.textSubtle,
    fontSize: 9,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  chartScale: {
    ...typography.label,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
  },
  chartRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 172,
    paddingBottom: spacing.xs,
  },
  chartColumn: {
    alignItems: 'center',
    width: 40,
  },
  chartBarSlot: {
    alignItems: 'center',
    height: 112,
    justifyContent: 'flex-end',
    width: '100%',
  },
  chartBar: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    minHeight: 2,
    width: 18,
  },
  chartLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.sm,
    maxWidth: 42,
  },
  chartValue: {
    ...typography.label,
    color: colors.textSubtle,
    fontSize: 9,
    marginTop: spacing.xs,
  },
  planList: {
    gap: spacing.md,
  },
  planToggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  planToggleDisabled: {
    opacity: 0.65,
  },
  planTogglePressed: {
    backgroundColor: colors.border,
  },
  planToggleText: {
    ...typography.label,
    color: colors.accent,
  },
  planSummary: {
    ...typography.body,
    color: colors.textMuted,
  },
  planRow: {
    gap: spacing.xs,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planLabel: {
    ...typography.label,
    color: colors.text,
  },
  planStatus: {
    ...typography.label,
    color: colors.textSubtle,
    fontSize: 10,
  },
  planStatusMet: {
    color: colors.success,
  },
  planTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  planActual: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: '100%',
  },
  planTarget: {
    backgroundColor: colors.text,
    height: '100%',
    position: 'absolute',
    width: 2,
  },
  planValue: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  insightRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  insightLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  insightValue: {
    ...typography.label,
    color: colors.accent,
  },
  listRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  listTitle: {
    ...typography.label,
    color: colors.text,
  },
  listDetail: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  listValue: {
    ...typography.label,
    color: colors.accent,
  },
  noteRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  noteDate: {
    ...typography.label,
    color: colors.accent,
    fontSize: 10,
  },
  noteText: {
    ...typography.body,
    color: colors.textMuted,
  },
  highlightRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  highlightTitle: {
    ...typography.label,
    color: colors.text,
  },
  highlightDetail: {
    ...typography.body,
    color: colors.textMuted,
  },
})
