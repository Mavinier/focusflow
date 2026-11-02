import { equal } from 'node:assert/strict'
import { test } from 'node:test'

import type { FocusSessionRow } from '../types/analytics'
import {
  calculateWeeklyGoalProgress,
  goalCompletionRate,
  plannedVsActual,
} from './goals'

const sessions: FocusSessionRow[] = [
  {
    activityDate: '2026-01-05',
    activityName: 'Java',
    color: '#d8f26b',
    durationMinutes: 60,
    startedAt: '2026-01-05T09:00:00',
    endedAt: '2026-01-05T10:00:00',
    note: null,
  },
  {
    activityDate: '2026-01-06',
    activityName: 'SQL',
    color: '#7ed6c0',
    durationMinutes: 60,
    startedAt: '2026-01-06T09:00:00',
    endedAt: '2026-01-06T10:00:00',
    note: null,
  },
  {
    activityDate: '2026-01-12',
    activityName: 'Reading',
    color: '#f5b97d',
    durationMinutes: 30,
    startedAt: null,
    endedAt: null,
    note: null,
  },
]

test('calculates planned versus actual weekly goals through a partial week', () => {
  const weeks = plannedVsActual(
    sessions,
    [{ weekStart: '2026-01-05', targetMinutes: 100 }],
    '2026-01-01',
    '2026-01-18',
    90,
  )

  equal(weeks.length, 3)
  equal(weeks[0]?.weekStart, '2025-12-29')
  equal(weeks[1]?.actualMinutes, 120)
  equal(weeks[1]?.targetMinutes, 100)
  equal(weeks[1]?.met, true)
  equal(weeks[2]?.actualMinutes, 30)
  equal(goalCompletionRate(weeks), 33.3)
})

test('calculates current weekly progress using the same date boundaries as the server', () => {
  const progress = calculateWeeklyGoalProgress('2026-01-07', sessions, 180)

  equal(progress.weekStart, '2026-01-05')
  equal(progress.trackedMinutes, 120)
  equal(progress.remainingMinutes, 60)
  equal(progress.progressPercent, 66.7)
})
