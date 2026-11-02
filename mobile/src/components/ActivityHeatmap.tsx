import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { DayData } from '../types/tracker'
import { buildHeatmap } from '../utils/heatmap'
import { formatDuration, formatShortDate, getTodayDateKey } from '../utils/tracker'
import { colors, radii, spacing, typography } from '../theme/tokens'
import { SurfaceCard } from './SurfaceCard'

type ActivityHeatmapProps = {
  availableYears: number[]
  dayData: DayData
  onModeChange: (useRollingWindow: boolean) => void
  onSelectDate: (date: string) => void
  onYearChange: (year: number) => void
  selectedDate: string
  useRollingWindow: boolean
  year: number
}

const intensityColors = {
  none: colors.surfaceRaised,
  low: '#52613b',
  medium: '#879d4f',
  high: '#aecb5d',
  'very-high': colors.accent,
} as const

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function ActivityHeatmap({
  availableYears,
  dayData,
  onModeChange,
  onSelectDate,
  onYearChange,
  selectedDate,
  useRollingWindow,
  year,
}: ActivityHeatmapProps) {
  const today = getTodayDateKey()
  const model = useMemo(
    () => buildHeatmap(dayData, year, today, useRollingWindow),
    [dayData, today, useRollingWindow, year],
  )
  const yearIndex = availableYears.indexOf(year)
  const previousYear = availableYears[yearIndex + 1]
  const nextYear = availableYears[yearIndex - 1]

  return (
    <SurfaceCard title="Activity map">
      <View style={styles.headingRow}>
        <Text style={styles.description}>
          {useRollingWindow && year === Number(today.slice(0, 4))
            ? 'Last 365 days, ending today.'
            : `Full calendar year ${year}.`}
        </Text>
        <View style={styles.controls}>
          {year === Number(today.slice(0, 4)) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onModeChange(!useRollingWindow)}
              style={styles.controlButton}
            >
              <Text style={styles.controlText}>
                {useRollingWindow ? `View ${year}` : '365 days'}
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.yearControl}>
            <Pressable
              accessibilityLabel="Previous heatmap year"
              accessibilityRole="button"
              disabled={previousYear === undefined}
              onPress={() => previousYear !== undefined && onYearChange(previousYear)}
              style={styles.iconButton}
            >
              <Ionicons color={previousYear === undefined ? colors.textSubtle : colors.text} name="chevron-back" size={15} />
            </Pressable>
            <Text style={styles.yearText}>{year}</Text>
            <Pressable
              accessibilityLabel="Next heatmap year"
              accessibilityRole="button"
              disabled={nextYear === undefined}
              onPress={() => nextYear !== undefined && onYearChange(nextYear)}
              style={styles.iconButton}
            >
              <Ionicons color={nextYear === undefined ? colors.textSubtle : colors.text} name="chevron-forward" size={15} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.weekdayLabels} accessibilityElementsHidden>
          {weekdayLabels.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekdayLabel}>{label}</Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartScroll}
        >
          <View>
            <View style={styles.monthRow}>
              {model.monthLabels.map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.monthLabel}>{label}</Text>
              ))}
            </View>
            <View style={styles.weekGrid}>
              {model.weeks.map((week) => (
                <View key={week[0]?.date} style={styles.weekColumn}>
                  {week.map((cell) => {
                    const isSelected = cell.date === selectedDate
                    return (
                      <Pressable
                        accessibilityLabel={`${formatShortDate(cell.date)}: ${cell.totalMinutes ? `${formatDuration(cell.totalMinutes)} focused` : 'No activity'}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: cell.isOutsideRange, selected: isSelected }}
                        disabled={cell.isOutsideRange}
                        key={cell.date}
                        onPress={() => onSelectDate(cell.date)}
                        style={[
                          styles.cell,
                          { backgroundColor: intensityColors[cell.intensity] },
                          cell.isOutsideRange && styles.outsideCell,
                          isSelected && styles.selectedCell,
                        ]}
                      />
                    )
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{model.activeDaysCount} active days</Text>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {(['none', 'low', 'medium', 'high', 'very-high'] as const).map((intensity) => (
            <View
              key={intensity}
              style={[styles.legendCell, { backgroundColor: intensityColors[intensity] }]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </SurfaceCard>
  )
}

const styles = StyleSheet.create({
  headingRow: {
    gap: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  controlText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 11,
  },
  yearControl: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  iconButton: {
    minHeight: 30,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    ...typography.label,
    color: colors.text,
    minWidth: 42,
    textAlign: 'center',
  },
  chartRow: {
    flexDirection: 'row',
  },
  weekdayLabels: {
    gap: 4,
    paddingTop: 22,
    width: 20,
  },
  weekdayLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    height: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
  chartScroll: {
    flex: 1,
  },
  monthRow: {
    flexDirection: 'row',
    height: 20,
  },
  monthLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    height: 18,
    width: 24,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    gap: 4,
    width: 20,
  },
  cell: {
    borderColor: 'transparent',
    borderRadius: 4,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  outsideCell: {
    opacity: 0.2,
  },
  selectedCell: {
    borderColor: colors.text,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    ...typography.label,
    color: colors.textMuted,
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendCell: {
    borderRadius: 3,
    height: 11,
    width: 11,
  },
  legendText: {
    color: colors.textSubtle,
    fontSize: 10,
  },
})
