import type { Activity, DayData } from '../types/tracker'
import { ACTIVITY_COLORS } from './activityColors'

export const SAMPLE_TRACKING_YEAR = 2026
export const SAMPLE_LAST_TRACKED_DATE = '2026-10-30'
export const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const activityTemplates: Activity[][] = [
  [
    { name: 'Java', duration: 125, color: ACTIVITY_COLORS.java, icon: 'code' },
    { name: 'SQL', duration: 80, color: ACTIVITY_COLORS.sql, icon: 'database' },
  ],
  [
    { name: 'Product work', duration: 160, color: ACTIVITY_COLORS.work, icon: 'work' },
    { name: 'Reading', duration: 45, color: ACTIVITY_COLORS.reading, icon: 'book' },
  ],
  [
    { name: 'NoSQL', duration: 90, color: ACTIVITY_COLORS.nosql, icon: 'database' },
    { name: 'Java', duration: 70, color: ACTIVITY_COLORS.java, icon: 'code' },
    { name: 'Notes & review', duration: 35, color: ACTIVITY_COLORS.notes, icon: 'notes' },
  ],
]

const sampleActivities: Activity[] = [
  { name: 'Java', duration: 150, color: ACTIVITY_COLORS.java, icon: 'code' },
  { name: 'SQL', duration: 110, color: ACTIVITY_COLORS.sql, icon: 'database' },
  { name: 'NoSQL', duration: 80, color: ACTIVITY_COLORS.nosql, icon: 'database' },
  { name: 'Project work', duration: 120, color: ACTIVITY_COLORS.work, icon: 'work' },
  { name: 'Reading', duration: 60, color: ACTIVITY_COLORS.reading, icon: 'book' },
]

const sampleNotes = [
  'Good balance between learning and project work. The Java session felt especially focused.',
  'A steady day. You made progress without overloading your schedule.',
  'Deep work block in the morning, followed by a useful review session.',
]

export function createDayData(): DayData {
  const records: DayData = {}
  const yearStart = new Date(`${SAMPLE_TRACKING_YEAR}-01-01T12:00:00`)

  for (
    let date = yearStart;
    date.toISOString().slice(0, 10) <= SAMPLE_LAST_TRACKED_DATE;
    date = addDays(date, 1)
  ) {
    const dateKey = date.toISOString().slice(0, 10)
    const dayOfYear = Math.floor((date.getTime() - yearStart.getTime()) / 86400000)
    const seed = (dayOfYear * 17 + date.getDay() * 31) % 23

    if (seed % 6 === 0 || date.getDay() === 0) continue

    const template = activityTemplates[seed % activityTemplates.length]
    const intensityBoost = seed % 5 === 0 ? 1.45 : seed % 3 === 0 ? 1.15 : 0.82
    const activities = template.map((activity) => ({
      ...activity,
      duration: Math.round(activity.duration * intensityBoost),
    }))
    const totalMinutes = activities.reduce((total, activity) => total + activity.duration, 0)

    records[dateKey] = {
      date: dateKey,
      totalMinutes,
      activities,
      note: sampleNotes[seed % sampleNotes.length],
    }
  }

  records[SAMPLE_LAST_TRACKED_DATE] = {
    date: SAMPLE_LAST_TRACKED_DATE,
    totalMinutes: sampleActivities.reduce((total, activity) => total + activity.duration, 0),
    activities: sampleActivities,
    note: 'Great deep-work day. You moved through Java fundamentals, SQL joins, and NoSQL modeling with a clear plan.',
  }

  return records
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}
