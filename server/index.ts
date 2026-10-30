import express from 'express'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from './db/client'
import { activities, dailyNotes, focusSessions, weeklyGoals } from './db/schema'
import { DEFAULT_WEEKLY_TARGET_MINUTES, getWeekEnd, getWeekStart } from './utils/week'
import type { ActivityIconName, DayData } from '../src/types/tracker'

const app = express()
const port = Number(process.env.PORT ?? 3001)

type SessionTiming =
  | {
      durationMinutes: number
      startedAt: string
      endedAt: string
    }
  | {
      error: string
    }

function calculateSessionTiming(
  activityDate: string,
  startTime: unknown,
  endTime: unknown,
  durationMinutes: unknown,
): SessionTiming {
  if (typeof startTime === 'string' || typeof endTime === 'string') {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

    if (
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      !timePattern.test(startTime) ||
      !timePattern.test(endTime)
    ) {
      return { error: 'startTime and endTime must use the HH:mm format' }
    }

    const startMinutes = parseTime(startTime)
    const endMinutes = parseTime(endTime)

    if (endMinutes <= startMinutes) {
      return { error: 'endTime must be later than startTime' }
    }

    const startedAt = new Date(`${activityDate}T${startTime}:00`)
    const endedAt = new Date(`${activityDate}T${endTime}:00`)

    return {
      durationMinutes: endMinutes - startMinutes,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    }
  }

  if (
    typeof durationMinutes === 'number' &&
    Number.isInteger(durationMinutes) &&
    durationMinutes > 0
  ) {
    const endedAtDate = new Date()
    const startedAtDate = new Date(endedAtDate.getTime() - durationMinutes * 60 * 1000)

    return {
      durationMinutes,
      startedAt: startedAtDate.toISOString(),
      endedAt: endedAtDate.toISOString(),
    }
  }

  return { error: 'Start and end times are required' }
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

function getWeeklyProgress(dateKey: string) {
  const weekStart = getWeekStart(dateKey)
  const weekEnd = getWeekEnd(weekStart)
  const goal = db
    .select()
    .from(weeklyGoals)
    .where(eq(weeklyGoals.weekStart, weekStart))
    .get()
  const sessionRows = db
    .select({ duration: focusSessions.durationMinutes })
    .from(focusSessions)
    .where(
      and(
        gte(focusSessions.activityDate, weekStart),
        lte(focusSessions.activityDate, weekEnd),
      ),
    )
    .all()
  const targetMinutes = goal?.targetMinutes ?? DEFAULT_WEEKLY_TARGET_MINUTES
  const trackedMinutes = sessionRows.reduce((total, row) => total + row.duration, 0)
  const remainingMinutes = targetMinutes - trackedMinutes

  return {
    weekStart,
    targetMinutes,
    trackedMinutes,
    remainingMinutes,
    progressPercent: targetMinutes
      ? Math.round((trackedMinutes / targetMinutes) * 1000) / 10
      : 0,
  }
}

app.get('/api/weekly-goal', (request, response) => {
  const date = String(request.query.date ?? '')

  if (!isDateKey(date)) {
    response.status(400).json({ error: 'date must use the YYYY-MM-DD format' })
    return
  }

  response.json(getWeeklyProgress(date))
})

app.put('/api/weekly-goal', (request, response) => {
  const { date, targetMinutes } = request.body as Record<string, unknown>

  if (
    typeof date !== 'string' ||
    !isDateKey(date) ||
    typeof targetMinutes !== 'number' ||
    !Number.isInteger(targetMinutes) ||
    targetMinutes <= 0
  ) {
    response.status(400).json({
      error: 'date and a positive integer targetMinutes are required',
    })
    return
  }

  const weekStart = getWeekStart(date)
  db.insert(weeklyGoals)
    .values({ weekStart, targetMinutes })
    .onConflictDoUpdate({
      target: weeklyGoals.weekStart,
      set: { targetMinutes },
    })
    .run()

  response.json(getWeeklyProgress(date))
})

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

app.get('/api/activities', (_request, response) => {
  response.json(db.select().from(activities).orderBy(asc(activities.name)).all())
})

app.get('/api/sessions', (request, response) => {
  const year = String(request.query.year ?? '2026')

  if (!/^\d{4}$/.test(year)) {
    response.status(400).json({ error: 'year must be a four-digit value' })
    return
  }

  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const sessions = db
    .select({
      activityDate: focusSessions.activityDate,
      activityName: activities.name,
      color: activities.color,
      durationMinutes: focusSessions.durationMinutes,
      startedAt: focusSessions.startedAt,
      endedAt: focusSessions.endedAt,
      note: focusSessions.note,
    })
    .from(focusSessions)
    .innerJoin(activities, eq(focusSessions.activityId, activities.id))
    .where(
      and(
        gte(focusSessions.activityDate, from),
        lte(focusSessions.activityDate, to),
      ),
    )
    .orderBy(asc(focusSessions.activityDate), asc(focusSessions.id))
    .all()
  const notes = db
    .select({
      activityDate: dailyNotes.activityDate,
      note: dailyNotes.note,
    })
    .from(dailyNotes)
    .where(
      and(
        gte(dailyNotes.activityDate, from),
        lte(dailyNotes.activityDate, to),
      ),
    )
    .orderBy(asc(dailyNotes.activityDate))
    .all()

  response.json({ year: Number(year), sessions, notes })
})

app.get('/api/weekly-goals', (request, response) => {
  const year = String(request.query.year ?? '2026')

  if (!/^\d{4}$/.test(year)) {
    response.status(400).json({ error: 'year must be a four-digit value' })
    return
  }

  const from = `${Number(year) - 1}-12-01`
  const to = `${year}-12-31`
  const goals = db
    .select({
      weekStart: weeklyGoals.weekStart,
      targetMinutes: weeklyGoals.targetMinutes,
    })
    .from(weeklyGoals)
    .where(
      and(
        gte(weeklyGoals.weekStart, from),
        lte(weeklyGoals.weekStart, to),
      ),
    )
    .orderBy(asc(weeklyGoals.weekStart))
    .all()

  response.json({ year: Number(year), goals })
})

app.get('/api/dashboard', (request, response) => {
  const year = String(request.query.year ?? '2026')

  if (!/^\d{4}$/.test(year)) {
    response.status(400).json({ error: 'year must be a four-digit value' })
    return
  }

  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const sessionRows = db
    .select({
      date: focusSessions.activityDate,
      duration: focusSessions.durationMinutes,
      activityName: activities.name,
      color: activities.color,
      icon: activities.icon,
    })
    .from(focusSessions)
    .innerJoin(activities, eq(focusSessions.activityId, activities.id))
    .where(
      and(
        gte(focusSessions.activityDate, from),
        lte(focusSessions.activityDate, to),
      ),
    )
    .orderBy(asc(focusSessions.activityDate), asc(focusSessions.id))
    .all()
  const noteRows = db
    .select()
    .from(dailyNotes)
    .where(
      and(
        gte(dailyNotes.activityDate, from),
        lte(dailyNotes.activityDate, to),
      ),
    )
    .all()
  const notesByDate = new Map(noteRows.map((note) => [note.activityDate, note.note]))
  const records: DayData = {}

  for (const row of sessionRows) {
    const record = records[row.date] ?? {
      date: row.date,
      totalMinutes: 0,
      note: notesByDate.get(row.date) ?? '',
      activities: [],
    }

    const existingActivity = record.activities.find(
      (activity) => activity.name === row.activityName,
    )

    record.totalMinutes += row.duration

    if (existingActivity) {
      existingActivity.duration += row.duration
    } else {
      record.activities.push({
        name: row.activityName,
        duration: row.duration,
        color: row.color,
        icon: row.icon as ActivityIconName,
      })
    }

    records[row.date] = record
  }

  response.json({ year: Number(year), records })
})

app.post('/api/focus-sessions', (request, response) => {
  const {
    activityDate,
    activityName,
    color = '#d8f26b',
    durationMinutes,
    endTime,
    icon = 'notes',
    note,
    startTime,
  } = request.body as Record<string, unknown>

  if (
    typeof activityDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(activityDate) ||
    typeof activityName !== 'string' ||
    !activityName.trim()
  ) {
    response.status(400).json({
      error: 'activityDate and activityName are required',
    })
    return
  }

  const timing = calculateSessionTiming(activityDate, startTime, endTime, durationMinutes)
  if ('error' in timing) {
    response.status(400).json({ error: timing.error })
    return
  }

  const existingActivity = db
    .select()
    .from(activities)
    .where(eq(activities.name, activityName.trim()))
    .get()
  const activity =
    existingActivity ??
    db
      .insert(activities)
      .values({
        name: activityName.trim(),
        color: typeof color === 'string' ? color : '#d8f26b',
        icon: typeof icon === 'string' ? icon : 'notes',
      })
      .returning()
      .get()

  const session = db
    .insert(focusSessions)
    .values({
      activityId: activity.id,
      activityDate,
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
      note: typeof note === 'string' ? note : null,
    })
    .returning()
    .get()

  if (typeof note === 'string' && note.trim()) {
    db.insert(dailyNotes)
      .values({ activityDate, note: note.trim() })
      .onConflictDoUpdate({
        target: dailyNotes.activityDate,
        set: { note: note.trim() },
      })
      .run()
  }

  response.status(201).json({ session, activity })
})

app.listen(port, () => {
  console.log(`Focusflow API listening on http://localhost:${port}`)
})
