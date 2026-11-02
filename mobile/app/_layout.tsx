import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Image, StyleSheet, Text, View } from 'react-native'

import { colors } from '../src/theme/tokens'
import { initializeDatabase } from '../src/db/database'
import { configureNotificationHandler, refreshLocalReminders } from '../src/services/notifications'

export default function RootLayout() {
  const [databaseError, setDatabaseError] = useState<Error | null>(null)
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    configureNotificationHandler()
    initializeDatabase()
      .then(() => {
        void refreshLocalReminders().catch(() => undefined)
        setDatabaseReady(true)
      })
      .catch((error: unknown) => {
        setDatabaseError(error instanceof Error ? error : new Error(String(error)))
      })
  }, [])

  if (databaseError) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Unable to open FocusFlow data</Text>
        <Text style={styles.errorMessage}>{databaseError.message}</Text>
      </View>
    )
  }

  if (!databaseReady) {
    return (
      <View style={styles.loadingScreen}>
        <Image source={require('../assets/icon.png')} style={styles.loadingIcon} />
        <Text style={styles.loadingBrand}>focusflow</Text>
        <Text style={styles.loadingTagline}>Your focus, in motion.</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="log-activity"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  errorScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingIcon: {
    height: 112,
    marginBottom: 24,
    width: 112,
  },
  loadingBrand: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  loadingTagline: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
})
