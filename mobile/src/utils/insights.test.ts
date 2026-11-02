import { equal, deepEqual } from 'node:assert/strict'
import { test } from 'node:test'

import type {
  DailyNoteRow,
  FocusSessionRow,
} from '../types/analytics'
import {
  buildHighlights,
  buildTrend,
  countDaysInRange,
  getPeriodRange,
  hourHistogram,
  longestSessions,
  neglectedAreas,
  recentNotes,
  sessionsToDayData,
  topDays,
  weekdayDistribution,
} from './insights'

function session(
  activityDate: string,
  activityName: string,
  durationMinutes: number,
  startedAt: string | null,
  note: string | null = null,
): FocusSessionRow {
  return {
    activityDate,
    activityName,
    color:
      activityName === 'Java'
        ? '#d8f26b'
        : activityName === 'SQL'
          ? '#7ed6c0'
          : '#f5b97d',
    durationMinutes,
    startedAt,
    endedAt: null,
    note,
  }
}

const sessions = [
  session('2026-01-05', 'Java', 60, '2026-01-05T09:00:00', 'Deep work'),
  session('2026-01-05', 'SQL', 30, '2026-01-05T14:00:00'),
  session('2026-01-07', 'Java', 90, '2026-01-07T10:00:00'),
  session('2026-01-12', 'Reading', 15, null),
]

test('builds date ranges, grouped day data, and period trends', () => {
  deepEqual(getPeriodRange('week', '2026-01-08'), {
    from: '2026-01-05',
    to: '2026-01-08',
  })
  equal(countDaysInRange('2026-01-01', '2026-01-08'), 8)

  const dayData = sessionsToDayData(sessions)
  equal(dayData['2026-01-05']?.totalMinutes, 90)
  equal(dayData['2026-01-05']?.activities.length, 2)

  const trend = buildTrend(sessions.slice(0, 3), 'week', '2026-01-08')
  equal(trend.length, 7)
  equal(trend[0]?.minutes, 90)
  equal(trend[2]?.minutes, 90)
  equal(trend[3]?.minutes, 0)
})

test('derives productive days, hours, weekdays, and neglected areas', () => {
  const productiveDays = topDays(sessions)
  equal(productiveDays[0]?.date, '2026-01-05')
  equal(productiveDays[0]?.minutes, 90)

  const hours = hourHistogram(sessions)
  equal(hours[0]?.hour, 6)
  equal(hours[3]?.hour, 9)
  equal(hours[3]?.minutes, 60)
  equal(hours.at(-1)?.hour, 21)

  const weekdays = weekdayDistribution(sessions)
  equal(weekdays[0]?.label, 'Mon')
  equal(weekdays[0]?.minutes, 105)

  const neglected = neglectedAreas(
    [...sessions, session('2026-02-01', 'SQL', 120, null)],
    sessions.slice(0, 3),
  )
  equal(neglected[0]?.name, 'Reading')
  equal(neglected[0]?.periodMinutes, 0)
  equal(neglected[0]?.yearMinutes, 15)
})

test('deduplicates notes and creates bounded highlights', () => {
  const notes: DailyNoteRow[] = [
    { activityDate: '2026-01-05', note: '  Plan the next block  ' },
    { activityDate: '2026-01-04', note: '   ' },
  ]
  const notesList = recentNotes(notes, [
    session('2026-01-05', 'Java', 30, null, 'Plan the next block'),
    session('2026-01-07', 'Java', 90, null, 'Ship the feature'),
  ])

  equal(notesList.length, 2)
  equal(notesList[0]?.note, 'Ship the feature')
  equal(notesList[1]?.source, 'session')

  const highlights = buildHighlights(
    3,
    5,
    longestSessions(sessions, 1)[0],
    {
      weekStart: '2026-01-05',
      label: 'Jan 5',
      targetMinutes: 120,
      actualMinutes: 90,
      met: false,
    },
  )
  equal(highlights.length, 4)
  equal(highlights[0]?.title, 'Longest streak')
  equal(highlights.at(-1)?.title, 'Weekly goal in progress')
})
