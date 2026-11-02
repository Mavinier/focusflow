import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AppScreen } from '../src/components/AppScreen'
import { SurfaceCard } from '../src/components/SurfaceCard'
import { colors, radii, spacing, typography } from '../src/theme/tokens'

export default function LogActivityScreen() {
  return (
    <AppScreen
      subtitle="The native activity form will be connected to SQLite next."
      title="Log activity"
    >
      <SurfaceCard title="New focus session">
        <View style={styles.previewField}>
          <Text style={styles.fieldLabel}>Activity area</Text>
          <Text style={styles.fieldValue}>Choose an area</Text>
        </View>
        <View style={styles.previewField}>
          <Text style={styles.fieldLabel}>Date and time</Text>
          <Text style={styles.fieldValue}>Today · Start and end time</Text>
        </View>
        <View style={styles.previewField}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <Text style={styles.fieldValue}>Optional session note</Text>
        </View>
      </SurfaceCard>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Back to overview</Text>
      </Pressable>
    </AppScreen>
  )
}

const styles = StyleSheet.create({
  previewField: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSubtle,
  },
  fieldValue: {
    ...typography.body,
    color: colors.textMuted,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 52,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.accentText,
  },
})
