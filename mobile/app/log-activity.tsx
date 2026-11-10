import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AppScreen } from '../src/components/AppScreen'
import { SurfaceCard } from '../src/components/SurfaceCard'
import { repositories } from '../src/db/repositories'
import { refreshLocalReminders } from '../src/services/notifications'
import { colors, radii, spacing, typography } from '../src/theme/tokens'
import {
  formatDuration,
  getDurationMinutes,
  getTodayDateKey,
  parseDateKey,
  toDateKey,
} from '../src/utils/tracker'

export default function LogActivityScreen() {
  const params = useLocalSearchParams<{ date?: string }>()
  const [activities] = useState(() => repositories.activities.listActive())
  const [activityDate, setActivityDate] = useState(
    isDateKey(params.date) ? params.date : getTodayDateKey(),
  )
  const [activityId, setActivityId] = useState<number | undefined>(
    activities[0]?.id,
  )
  const [startTime, setStartTime] = useState(getDefaultTimeRange().startTime)
  const [endTime, setEndTime] = useState(getDefaultTimeRange().endTime)
  const [activeTimeField, setActiveTimeField] = useState<TimeFieldKey | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const durationMinutes = getDurationMinutes(startTime, endTime)

  function handleSave() {
    if (!isDateKey(activityDate)) {
      setError('Use a valid date in YYYY-MM-DD format.')
      return
    }
    if (!activityId) {
      setError('Choose an activity area before saving.')
      return
    }
    if (!durationMinutes) {
      setError('The end time must be later than the start time.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      repositories.focusSessions.create({
        activityId,
        activityDate,
        startedAt: new Date(`${activityDate}T${startTime}:00`).toISOString(),
        endedAt: new Date(`${activityDate}T${endTime}:00`).toISOString(),
        durationMinutes,
        note: note.trim() || null,
      })
      void refreshLocalReminders().catch(() => undefined)
      router.back()
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save activity.')
    } finally {
      setIsSaving(false)
    }
  }

  function toggleTimeField(field: TimeFieldKey) {
    setActiveTimeField((current) => current === field ? null : field)
  }

  function handleTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setActiveTimeField(null)
      return
    }
    if (!selectedDate || !activeTimeField) return

    const selectedTime = toTimeValue(selectedDate.getHours() * 60 + selectedDate.getMinutes())
    if (activeTimeField === 'start') {
      setStartTime(selectedTime)
    } else {
      setEndTime(selectedTime)
    }

    if (Platform.OS === 'android') setActiveTimeField(null)
  }

  return (
    <AppScreen subtitle="Capture where your time went." title="Log activity">
      <SurfaceCard title="New focus session">
        <FieldLabel label="Date" />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          onChangeText={setActivityDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={activityDate}
        />

        <Text style={styles.fieldLabel}>Activity area</Text>
        <ScrollView
          contentContainerStyle={styles.activityChoices}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {activities.map((activity) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activity.id === activityId }}
              key={activity.id}
              onPress={() => setActivityId(activity.id)}
              style={[
                styles.activityChoice,
                activity.id === activityId && styles.activityChoiceSelected,
              ]}
            >
              <View style={[styles.choiceDot, { backgroundColor: activity.color }]} />
              <Text
                style={[
                  styles.activityChoiceText,
                  activity.id === activityId && styles.activityChoiceTextSelected,
                ]}
              >
                {activity.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.timeRow}>
          <TimeFieldInput
            isActive={activeTimeField === 'start'}
            label="Started at"
            onChangeText={setStartTime}
            onPress={() => toggleTimeField('start')}
            value={startTime}
          />
          <TimeFieldInput
            isActive={activeTimeField === 'end'}
            label="Ended at"
            onChangeText={setEndTime}
            onPress={() => toggleTimeField('end')}
            value={endTime}
          />
        </View>
        {Platform.OS !== 'web' && activeTimeField ? (
          <View style={styles.timePicker}>
            <DateTimePicker
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              mode="time"
              onChange={handleTimeChange}
              value={getTimeDate(activeTimeField === 'start' ? startTime : endTime)}
            />
          </View>
        ) : null}

        <View style={styles.durationPreview}>
          <Text style={styles.fieldLabel}>Time spent</Text>
          <Text style={styles.durationText}>
            {durationMinutes ? formatDuration(durationMinutes) : 'Set a valid time range'}
          </Text>
        </View>

        <FieldLabel label="Note (optional)" />
        <TextInput
          multiline
          onChangeText={setNote}
          placeholder="What did you learn or accomplish?"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, styles.noteInput]}
          textAlignVertical="top"
          value={note}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SurfaceCard>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          isSaving && styles.disabledButton,
        ]}
      >
        <Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save activity'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </AppScreen>
  )
}

type TimeFieldKey = 'start' | 'end'

function TimeFieldInput({
  isActive,
  label,
  onChangeText,
  onPress,
  value,
}: {
  isActive: boolean
  label: string
  onChangeText: (value: string) => void
  onPress: () => void
  value: string
}) {
  return (
    <View style={styles.timeField}>
      <FieldLabel label={label} />
      {Platform.OS === 'web' ? (
        <TextInput
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          onChangeText={onChangeText}
          placeholder="09:00"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={value}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isActive }}
          onPress={onPress}
          style={({ pressed }) => [
            styles.timeButton,
            isActive && styles.timeButtonActive,
            pressed && styles.timeButtonPressed,
          ]}
        >
          <Text style={styles.timeButtonText}>{value}</Text>
          <Ionicons color={colors.accent} name="time-outline" size={18} />
        </Pressable>
      )}
    </View>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>
}

function isDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDateKey(parseDateKey(value)) === value
}

function toTimeValue(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getTimeDate(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

function getDefaultTimeRange() {
  const now = new Date()
  const endMinutes = now.getHours() * 60 + now.getMinutes()
  return {
    startTime: toTimeValue(Math.max(0, endMinutes - 60)),
    endTime: toTimeValue(endMinutes),
  }
}

const styles = StyleSheet.create({
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
    paddingVertical: spacing.sm,
  },
  activityChoices: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  activityChoice: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityChoiceSelected: {
    borderColor: colors.accent,
  },
  choiceDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  activityChoiceText: {
    ...typography.label,
    color: colors.textMuted,
  },
  activityChoiceTextSelected: {
    color: colors.accent,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  timeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  timeButtonActive: {
    borderColor: colors.accent,
  },
  timeButtonPressed: {
    backgroundColor: colors.border,
  },
  timeButtonText: {
    ...typography.body,
    color: colors.text,
  },
  timePicker: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  durationPreview: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  durationText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 88,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.accentText,
  },
  cancelButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.label,
    color: colors.textMuted,
  },
})
