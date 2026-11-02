import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import type { DayData } from '../types/tracker'
import {
  buildFocusMix,
  calculateActiveStreak,
  calculateLongestStreak,
  calculatePercentChange,
  totalMinutesThrough,
} from './analytics'

const dayData: DayData = {
  '2026-01-01': {
    date: '2026-01-01',
    totalMinutes: 60,
    note: '',
    activities: [
      { name: 'Java', color: '#d8f26b', duration: 60, icon: 'code' },
    ],
  },
  '2026-01-02': {
    date: '2026-01-02',
    totalMinutes: 120,
    note: '',
    activities: [
      { name: 'Java', color: '#d8f26b', duration: 30, icon: 'code' },
      { name: 'SQL', color: '#7ed6c0', duration: 90, icon: 'database' },
    ],
  },
  '2026-01-04': {
    date: '2026-01-04',
    totalMinutes: 45,
    note: '',
    activities: [
      { name: 'SQL', color: '#7ed6c0', duration: 45, icon: 'database' },
    ],
  },
}

test('calculates current and longest active streaks', () => {
  equal(calculateActiveStreak(dayData), 1)
  equal(calculateLongestStreak(dayData), 2)
})

test('builds a duration-weighted focus mix with active-day counts', () => {
  deepEqual(buildFocusMix(dayData), [
    {
      name: 'SQL',
      color: '#7ed6c0',
      durationMinutes: 135,
      activeDays: 2,
      percentage: 60,
    },
    {
      name: 'Java',
      color: '#d8f26b',
      durationMinutes: 90,
      activeDays: 2,
      percentage: 40,
    },
  ])
  equal(totalMinutesThrough(dayData, '2026-01-02'), 180)
})

test('returns percentage change as one decimal place and handles no baseline', () => {
  equal(calculatePercentChange(135, 90), 50)
  equal(calculatePercentChange(10, 0), null)
})
