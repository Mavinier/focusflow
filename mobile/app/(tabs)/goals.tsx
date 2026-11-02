import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AppScreen } from '../../src/components/AppScreen'
import { SurfaceCard } from '../../src/components/SurfaceCard'
import { colors, radii, spacing, typography } from '../../src/theme/tokens'

export default function GoalsScreen() {
  return (
    <AppScreen
      subtitle="A small target makes consistency easier"
      title="Weekly goals"
    >
      <SurfaceCard
        description="Your default goal can be adjusted once the local database is connected."
        title="This week"
      >
        <View style={styles.goalHeader}>
          <View>
            <Text style={styles.goalValue}>0 min</Text>
            <Text style={styles.goalMeta}>of 600 min tracked</Text>
          </View>
          <Text style={styles.goalPercent}>0%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.remaining}>600 minutes remaining</Text>
      </SurfaceCard>

      <Pressable
        accessibilityRole="button"
        onPress={() => undefined}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
      >
        <Text style={styles.editButtonText}>Set weekly target</Text>
      </Pressable>

      <SurfaceCard title="Why goals matter">
        <Text style={styles.body}>
          FocusFlow measures progress by active days and focused minutes, so
          your goal can support a routine without turning study into a streak
          competition.
        </Text>
      </SurfaceCard>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
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
    width: '0%',
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
    marginVertical: spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  editButtonText: {
    ...typography.label,
    color: colors.accent,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
})
