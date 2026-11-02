import { equal } from 'node:assert/strict'
import { test } from 'node:test'

import {
  countDaysInclusive,
  formatDuration,
  getDurationMinutes,
  getActivityMapRange,
  getCategoryLabel,
  getIntensity,
  getWeekEnd,
  getWeekStart,
  toDateKey,
} from './tracker'

test('uses local calendar components for date keys and week boundaries', () => {
  equal(toDateKey(new Date(2026, 10, 2, 23, 30)), '2026-11-02')
  equal(getWeekStart('2026-11-01'), '2026-10-26')
  equal(getWeekEnd('2026-10-26'), '2026-11-01')
  equal(countDaysInclusive('2026-10-26', '2026-11-01'), 7)
})

test('creates a 365-day rolling range ending on today', () => {
  const range = getActivityMapRange(2026, '2026-11-02')

  equal(range.from, '2025-11-03')
  equal(range.to, '2026-11-02')
  equal(countDaysInclusive(range.from, range.to), 365)
})

test('maps minutes to display intensity and duration labels', () => {
  equal(getIntensity(0), 'none')
  equal(getIntensity(89), 'low')
  equal(getIntensity(90), 'medium')
  equal(getIntensity(240), 'high')
  equal(getIntensity(420), 'very-high')
  equal(getCategoryLabel(0), 'No activity')
  equal(getCategoryLabel(125), 'Steady')
  equal(formatDuration(125), '2h 5m')
})

test('calculates valid activity durations from HH:mm values', () => {
  equal(getDurationMinutes('09:15', '10:45'), 90)
  equal(getDurationMinutes('10:00', '10:00'), null)
  equal(getDurationMinutes('10:00', 'invalid'), null)
})
