import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { repositories } from '../../src/db/repositories'
import type { FocusSessionRow, WeeklyGoalRow } from '../../src/types/analytics'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'
import {
  calculateWeeklyGoalProgress,
  goalCompletionRate,
  plannedVsActual,
  type WeekPlanActual,
} from '../../src/utils/goals'
import { totalMinutes } from '../../src/utils/insights'
import { formatDuration, formatShortDate, getTodayDateKey, getWeekEnd, getWeekStart } from '../../src/utils'

export default function GoalsScreen() {
  const today = getTodayDateKey()
  const selectedYear = Number(today.slice(0, 4))
  const currentWeekStart = getWeekStart(today)
  const [sessions, setSessions] = useState<FocusSessionRow[]>([])
  const [goals, setGoals] = useState<WeeklyGoalRow[]>([])
  const [defaultTarget, setDefaultTarget] = useState(600)
  const [targetInput, setTargetInput] = useState('600')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      try {
        setIsLoading(true)
        const settings = repositories.appSettings.get()
        const weeklyGoals = repositories.weeklyGoals.list()
        const target = weeklyGoals.find((goal) => goal.weekStart === currentWeekStart)?.targetMinutes
          ?? settings?.defaultWeeklyTargetMinutes
          ?? 600
        setSessions(repositories.focusSessions.listWithActivities())
        setGoals(weeklyGoals)
        setDefaultTarget(settings?.defaultWeeklyTargetMinutes ?? 600)
        setTargetInput(String(target))
        setError(null)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load goals.')
      } finally {
        setIsLoading(false)
      }
    }, [currentWeekStart]),
  )

  const currentTarget = goals.find((goal) => goal.weekStart === currentWeekStart)?.targetMinutes
    ?? defaultTarget
  const weeklyProgress = useMemo(
    () => calculateWeeklyGoalProgress(today, sessions, currentTarget),
    [currentTarget, sessions, today],
  )
  const yearSessions = useMemo(
    () => sessions.filter((session) => session.activityDate >= `${selectedYear}-01-01` && session.activityDate <= today),
    [selectedYear, sessions, today],
  )
  const weeks = useMemo(
    () => plannedVsActual(yearSessions, goals, `${selectedYear}-01-01`, today, defaultTarget),
    [defaultTarget, goals, selectedYear, today, yearSessions],
  )
  const trackedMinutes = totalMinutes(yearSessions)
  const plannedMinutes = weeks.reduce((total, week) => total + week.targetMinutes, 0)
  const completedWeeks = weeks.filter((week) => week.met).length
  const activeWeeks = weeks.filter((week) => week.actualMinutes > 0).length
  const completion = goalCompletionRate(weeks)

  function saveTarget() {
    const target = Number(targetInput)
    if (!Number.isInteger(target) || target < 30 || target > 10080) {
      setError('Set a whole-number target between 30 and 10,080 minutes.')
      return
    }

    try {
      repositories.weeklyGoals.upsert({ weekStart: currentWeekStart, targetMinutes: target })
      setGoals(repositories.weeklyGoals.list())
      setIsEditing(false)
      setMessage('This week’s target was saved.')
      setError(null)
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the weekly target.')
    }
  }

  return (
    <AppScreen
      subtitle={`Set a target, review your weeks, and keep your focus moving forward · ${selectedYear}`}
      title="Make your time intentional."
    >
      {isLoading ? <Text style={styles.statusText}>Loading goal data…</Text> : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <SummaryStat label="Current weekly goal" value={formatDuration(weeklyProgress.targetMinutes)} detail={`${formatDuration(weeklyProgress.trackedMinutes)} tracked this week`} />
        <SummaryStat label={`Tracked in ${selectedYear}`} value={formatDuration(trackedMinutes)} detail={`${activeWeeks} active weeks`} />
        <SummaryStat label="Goals reached" value={`${completedWeeks} / ${weeks.length}`} detail={`${completion}% of weekly targets met`} />
        <SummaryStat label="Planned focus" value={formatDuration(plannedMinutes)} detail="Across the selected year" />
      </View>

      <SurfaceCard
        description={`${formatShortDate(weeklyProgress.weekStart)} – ${formatShortDate(getWeekEnd(weeklyProgress.weekStart))}`}
        title="This week"
      >
        <View style={styles.goalHeader}>
          <View>
            <Text style={styles.goalValue}>{formatDuration(weeklyProgress.trackedMinutes)}</Text>
            <Text style={styles.goalMeta}>of {formatDuration(weeklyProgress.targetMinutes)} focused</Text>
          </View>
          <Text style={styles.goalPercent}>{Math.round(weeklyProgress.progressPercent)}%</Text>
        </View>
        <View accessibilityLabel={`${Math.round(weeklyProgress.progressPercent)} percent of weekly goal`} style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(weeklyProgress.progressPercent, 100)}%` }]} />
        </View>
        <Text style={styles.remaining}>
          {weeklyProgress.remainingMinutes > 0
            ? `${formatDuration(weeklyProgress.remainingMinutes)} remaining`
            : `${formatDuration(Math.abs(weeklyProgress.remainingMinutes))} over goal`}
        </Text>
      </SurfaceCard>

      <Pressable
        accessibilityRole="button"
        onPress={() => setIsEditing((current) => !current)}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
      >
        <Text style={styles.editButtonText}>{isEditing ? 'Cancel target edit' : 'Set weekly target'}</Text>
      </Pressable>

      {isEditing ? (
        <SurfaceCard description="This target applies to the current week. Future weeks use your default preference." title="Adjust this target">
          <Text style={styles.fieldLabel}>Minutes this week</Text>
          <TextInput
            accessibilityLabel="Weekly target in minutes"
            keyboardType="number-pad"
            onChangeText={setTargetInput}
            style={styles.input}
            value={targetInput}
          />
          <Pressable
            accessibilityRole="button"
            onPress={saveTarget}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <Text style={styles.saveButtonText}>Save target</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      <SurfaceCard description={`${weeks.length} weeks in the selected year.`} title="Planned vs actual">
        <View style={styles.historyList}>
          {[...weeks].reverse().map((week) => <GoalWeekRow key={week.weekStart} week={week} />)}
        </View>
      </SurfaceCard>

      <SurfaceCard title="Why goals matter">
        <Text style={styles.body}>
          FocusFlow measures progress by active days and focused minutes, so your goal can support a routine without turning study into a streak competition.
        </Text>
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

function GoalWeekRow({ week }: { week: WeekPlanActual }) {
  const progress = week.targetMinutes
    ? Math.min((week.actualMinutes / week.targetMinutes) * 100, 100)
    : 0
  const isOverGoal = week.actualMinutes > week.targetMinutes

  return (
    <View style={styles.weekRow}>
      <View style={styles.weekHeading}>
        <View>
          <Text style={styles.weekLabel}>{week.label}</Text>
          <Text style={[styles.weekStatus, week.met && styles.weekStatusMet]}>{week.met ? 'Goal met' : 'Below target'}</Text>
        </View>
        <Text style={styles.weekValue}>
          {formatDuration(week.actualMinutes)} / {formatDuration(week.targetMinutes)}
        </Text>
      </View>
      <View style={styles.weekTrack}>
        <View style={[styles.weekFill, { width: `${progress}%` }]} />
      </View>
      {isOverGoal ? <Text style={styles.overGoal}>+{formatDuration(week.actualMinutes - week.targetMinutes)}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  statusText: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  goalHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalValue: {
    ...typography.display,
    color: colors.text,
  },
  goalMeta: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  goalPercent: {
    ...typography.title,
    color: colors.accent,
  },
  progressTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: '100%',
  },
  remaining: {
    ...typography.label,
    color: colors.textSubtle,
  },
  editButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: spacing.lg,
    minHeight: 50,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  editButtonText: {
    ...typography.label,
    color: colors.accent,
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
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.sm,
  },
  saveButtonText: {
    ...typography.label,
    color: colors.accentText,
  },
  historyList: {
    gap: spacing.lg,
  },
  weekRow: {
    gap: spacing.xs,
  },
  weekHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLabel: {
    ...typography.label,
    color: colors.text,
  },
  weekStatus: {
    ...typography.label,
    color: colors.textSubtle,
    fontSize: 10,
  },
  weekStatusMet: {
    color: colors.success,
  },
  weekValue: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  weekTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  weekFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: '100%',
  },
  overGoal: {
    ...typography.label,
    color: colors.success,
    fontSize: 10,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
})
