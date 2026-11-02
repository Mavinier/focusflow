import { equal, ok } from 'node:assert/strict'
import { test } from 'node:test'

import type { DayData } from '../types/tracker'
import { buildHeatmap } from './heatmap'

const dayData: DayData = {
  '2026-11-01': {
    date: '2026-11-01',
    totalMinutes: 90,
    note: '',
    activities: [],
  },
  '2026-11-02': {
    date: '2026-11-02',
    totalMinutes: 420,
    note: '',
    activities: [],
  },
}

test('builds padded Sunday-to-Saturday heatmap weeks with range metadata', () => {
  const heatmap = buildHeatmap(dayData, 2026, '2026-11-02')

  equal(heatmap.from, '2025-11-03')
  equal(heatmap.to, '2026-11-02')
  equal(heatmap.weeks.every((week) => week.length === 7), true)
  equal(heatmap.activeDaysCount, 2)

  const selectedDay = heatmap.weeks.flat().find((cell) => cell.date === '2026-11-02')
  ok(selectedDay)
  equal(selectedDay.totalMinutes, 420)
  equal(selectedDay.intensity, 'very-high')
  equal(selectedDay.isOutsideRange, false)
})

test('marks calendar padding outside the selected full-year range', () => {
  const heatmap = buildHeatmap({}, 2025, '2026-11-02', false)
  const firstCell = heatmap.weeks[0]?.[0]
  const lastCell = heatmap.weeks.at(-1)?.at(-1)

  equal(heatmap.from, '2025-01-01')
  equal(heatmap.to, '2025-12-31')
  ok(firstCell)
  ok(lastCell)
  equal(firstCell.isOutsideRange, true)
  equal(lastCell.isOutsideRange, true)
})
