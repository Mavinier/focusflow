import express from 'express'
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm'
import { db } from './db/client'
import {
  activities,
  appSettings,
  dailyNotes,
  focusSessions,
  notifications,
  weeklyGoals,
} from './db/schema'
import { DEFAULT_WEEKLY_TARGET_MINUTES, getWeekEnd, getWeekStart } from './utils/week'
import {
  ensureAppSettings,
  listNotifications,
  serializeSettings,
} from './utils/notifications'
import { ACTIVITY_COLOR_PALETTE } from '../src/data/activityColors'
import type { ActivityIconName, DayData } from '../src/types/tracker'

const app = express()
const port = Number(process.env.PORT ?? 3001)

function getCurrentYear() {
  return String(new Date().getFullYear())
}

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

function getNextActivityColor() {
  const activityCount = db.select({ id: activities.id }).from(activities).all().length
  return ACTIVITY_COLOR_PALETTE[activityCount % ACTIVITY_COLOR_PALETTE.length]
}

app.use(express.json())
ensureAppSettings()

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

app.patch('/api/activities/:id', (request, response) => {
  const activityId = Number(request.params.id)
  const body = request.body as Record<string, unknown>

  if (!Number.isInteger(activityId) || activityId <= 0) {
    response.status(400).json({ error: 'id must be a positive integer' })
    return
  }

  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .get()
  if (!activity) {
    response.status(404).json({ error: 'Activity not found' })
    return
  }

  const updates: Partial<typeof activities.$inferInsert> = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      response.status(400).json({ error: 'name must be a non-empty string' })
      return
    }

    const nextName = body.name.trim()
    const duplicate = db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.name, nextName))
      .get()
    if (duplicate && duplicate.id !== activityId) {
      response.status(409).json({ error: 'An activity with that name already exists' })
      return
    }
    updates.name = nextName
  }

  if (body.color !== undefined) {
    if (typeof body.color !== 'string' || !/^#[\da-f]{6}$/i.test(body.color)) {
      response.status(400).json({ error: 'color must be a six-digit hex value' })
      return
    }
    updates.color = body.color
  }

  if (body.icon !== undefined) {
    const validIcons: ActivityIconName[] = ['code', 'database', 'book', 'work', 'notes']
    if (typeof body.icon !== 'string' || !validIcons.includes(body.icon as ActivityIconName)) {
      response.status(400).json({ error: 'icon is not supported' })
      return
    }
    updates.icon = body.icon
  }

  if (!Object.keys(updates).length) {
    response.status(400).json({ error: 'At least one activity field is required' })
    return
  }

  const updatedActivity = db
    .update(activities)
    .set(updates)
    .where(eq(activities.id, activityId))
    .returning()
    .get()
  response.json(updatedActivity)
})

app.get('/api/settings', (_request, response) => {
  response.json(serializeSettings(ensureAppSettings()))
})

app.patch('/api/settings', (request, response) => {
  const body = request.body as Record<string, unknown>
  const updates: Partial<typeof appSettings.$inferInsert> = {}

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || !body.displayName.trim()) {
      response.status(400).json({ error: 'displayName must be a non-empty string' })
      return
    }
    updates.displayName = body.displayName.trim().slice(0, 80)
  }

  if (body.defaultWeeklyTargetMinutes !== undefined) {
    if (
      typeof body.defaultWeeklyTargetMinutes !== 'number' ||
      !Number.isInteger(body.defaultWeeklyTargetMinutes) ||
      body.defaultWeeklyTargetMinutes < 30 ||
      body.defaultWeeklyTargetMinutes > 10080
    ) {
      response.status(400).json({ error: 'defaultWeeklyTargetMinutes must be between 30 and 10080' })
      return
    }
    updates.defaultWeeklyTargetMinutes = body.defaultWeeklyTargetMinutes
  }

  if (body.weekStartsOn !== undefined) {
    if (
      typeof body.weekStartsOn !== 'number' ||
      !Number.isInteger(body.weekStartsOn) ||
      body.weekStartsOn < 0 ||
      body.weekStartsOn > 6
    ) {
      response.status(400).json({ error: 'weekStartsOn must be a day number between 0 and 6' })
      return
    }
    updates.weekStartsOn = body.weekStartsOn
  }

  if (body.theme !== undefined) {
    if (body.theme !== 'dark') {
      response.status(400).json({ error: 'Only the dark theme is currently supported' })
      return
    }
    updates.theme = 'dark'
  }

  const booleanFields = [
    'notificationsEnabled',
    'goalNotificationsEnabled',
    'streakNotificationsEnabled',
    'inactivityNotificationsEnabled',
  ] as const
  for (const field of booleanFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'boolean') {
        response.status(400).json({ error: `${field} must be a boolean` })
        return
      }
      updates[field] = body[field] ? 1 : 0
    }
  }

  if (body.inactivityThresholdDays !== undefined) {
    if (
      typeof body.inactivityThresholdDays !== 'number' ||
      !Number.isInteger(body.inactivityThresholdDays) ||
      body.inactivityThresholdDays < 1 ||
      body.inactivityThresholdDays > 30
    ) {
      response.status(400).json({ error: 'inactivityThresholdDays must be between 1 and 30' })
      return
    }
    updates.inactivityThresholdDays = body.inactivityThresholdDays
  }

  if (!Object.keys(updates).length) {
    response.status(400).json({ error: 'At least one setting is required' })
    return
  }

  db.update(appSettings)
    .set(updates)
    .where(eq(appSettings.id, 1))
    .run()
  response.json(serializeSettings(ensureAppSettings()))
})

app.get('/api/notifications', (_request, response) => {
  response.json(listNotifications())
})

app.patch('/api/notifications/:id/read', (request, response) => {
  const notificationId = Number(request.params.id)
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    response.status(400).json({ error: 'id must be a positive integer' })
    return
  }

  db.update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(eq(notifications.id, notificationId))
    .run()
  response.status(204).send()
})

app.post('/api/notifications/read-all', (_request, response) => {
  db.update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(isNull(notifications.readAt))
    .run()
  response.status(204).send()
})

app.get('/api/years', (_request, response) => {
  const years = new Set<number>([new Date().getFullYear()])
  const sessionRows = db
    .select({ activityDate: focusSessions.activityDate })
    .from(focusSessions)
    .all()

  for (const row of sessionRows) {
    const year = Number(row.activityDate.slice(0, 4))
    if (Number.isInteger(year)) years.add(year)
  }

  response.json({ years: Array.from(years).sort((first, second) => second - first) })
})

app.get('/api/sessions', (request, response) => {
  const year = String(request.query.year ?? getCurrentYear())

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
  const year = String(request.query.year ?? getCurrentYear())

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
  const year = String(request.query.year ?? getCurrentYear())

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
    color,
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
        color: typeof color === 'string' ? color : getNextActivityColor(),
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
