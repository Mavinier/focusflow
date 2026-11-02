import assert from 'node:assert/strict'
import test from 'node:test'

import { parseFocusFlowBackup } from '../types/backup'

const validBackup = {
  exportedAt: '2026-11-02T12:00:00.000Z',
  settings: {
    id: 1,
    displayName: 'FocusFlow',
    defaultWeeklyTargetMinutes: 600,
    weekStartsOn: 1,
    theme: 'dark',
    notificationsEnabled: 1,
    goalNotificationsEnabled: 1,
    streakNotificationsEnabled: 1,
    inactivityNotificationsEnabled: 1,
    inactivityThresholdDays: 3,
  },
  activities: [{ id: 1, name: 'Reading', color: '#f5b97d', icon: 'book' }],
  focusSessions: [{
    id: 1,
    activityId: 1,
    activityDate: '2026-11-02',
    startedAt: '2026-11-02T09:00:00.000Z',
    endedAt: '2026-11-02T10:00:00.000Z',
    durationMinutes: 60,
    note: 'Chapter one',
  }],
  dailyNotes: [{ id: 1, activityDate: '2026-11-02', note: 'Keep going.' }],
  weeklyGoals: [{ id: 1, weekStart: '2026-11-02', targetMinutes: 600 }],
  notifications: [{
    id: 1,
    eventKey: 'goal:2026-11-02',
    type: 'goal',
    title: 'Weekly goal',
    message: 'Keep going.',
    href: '/goals',
    createdAt: '2026-11-02T12:00:00.000Z',
    readAt: null,
  }],
}

test('parses a web-compatible backup and fills optional notifications', () => {
  const backup = parseFocusFlowBackup({
    ...validBackup,
    notifications: undefined,
  })

  assert.equal(backup.settings?.displayName, 'FocusFlow')
  assert.equal(backup.activities[0]?.name, 'Reading')
  assert.equal(backup.focusSessions[0]?.durationMinutes, 60)
  assert.equal(backup.weeklyGoals[0]?.targetMinutes, 600)
  assert.equal(backup.dailyNotes[0]?.note, 'Keep going.')
  assert.equal(backup.notifications.length, 0)
})

test('rejects backups with broken session references', () => {
  assert.throws(
    () => parseFocusFlowBackup({
      ...validBackup,
      focusSessions: [{ ...validBackup.focusSessions[0], activityId: 99 }],
    }),
    /unknown activity area/,
  )
})
