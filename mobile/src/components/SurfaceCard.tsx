import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { colors, radii, spacing, typography } from '../theme/tokens'

type SurfaceCardProps = {
  children: ReactNode
  title?: string
  description?: string
}

export function SurfaceCard({
  children,
  title,
  description,
}: SurfaceCardProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
})
