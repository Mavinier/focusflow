import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'

import { db, type AppDatabase } from './database'
import { DEFAULT_APP_SETTINGS } from './defaults'
import {
  activities,
  appSettings,
  dailyNotes,
  focusSessions,
  notifications,
  weeklyGoals,
  type Activity,
  type AppSettings,
  type DailyNote,
  type FocusSession,
  type NewActivity,
  type NewDailyNote,
  type NewFocusSession,
  type NewNotification,
  type NewWeeklyGoal,
  type Notification,
  type WeeklyGoal,
} from './schema'
import { parseFocusFlowBackup, type FocusFlowBackup } from '../types/backup'
import type { FocusSessionRow } from '../types/analytics'

type ActivityChanges = Partial<Omit<NewActivity, 'id'>>
type FocusSessionChanges = Partial<Omit<NewFocusSession, 'id'>>
type WeeklyGoalChanges = Partial<Omit<NewWeeklyGoal, 'id'>>
type SettingsChanges = Partial<Omit<AppSettings, 'id'>>

export interface ActivityRepository {
  list(): Activity[]
  getById(id: number): Activity | undefined
  getByName(name: string): Activity | undefined
  create(input: NewActivity): Activity
  update(id: number, changes: ActivityChanges): Activity | undefined
  delete(id: number): void
}

export interface FocusSessionRepository {
  list(): FocusSession[]
  listWithActivities(): FocusSessionRow[]
  listByDate(activityDate: string): FocusSession[]
  listBetween(from: string, to: string): FocusSession[]
  getById(id: number): FocusSession | undefined
  create(input: NewFocusSession): FocusSession
  update(id: number, changes: FocusSessionChanges): FocusSession | undefined
  delete(id: number): void
}

export interface DailyNoteRepository {
  listBetween(from: string, to: string): DailyNote[]
  getByDate(activityDate: string): DailyNote | undefined
  upsert(input: Omit<NewDailyNote, 'id'>): DailyNote
  deleteByDate(activityDate: string): void
}

export interface WeeklyGoalRepository {
  list(): WeeklyGoal[]
  getByWeekStart(weekStart: string): WeeklyGoal | undefined
  upsert(input: Omit<NewWeeklyGoal, 'id'>): WeeklyGoal
  update(id: number, changes: WeeklyGoalChanges): WeeklyGoal | undefined
  delete(id: number): void
}

export interface AppSettingsRepository {
  get(): AppSettings | undefined
  update(changes: SettingsChanges): AppSettings | undefined
}

export interface NotificationRepository {
  list(limit?: number): Notification[]
  getByEventKey(eventKey: string): Notification | undefined
  create(input: NewNotification): Notification
  unreadCount(): number
  markRead(id: number, readAt?: string): void
  markAllRead(readAt?: string): void
}

export interface DataRepository {
  export(): FocusFlowBackup
  replace(input: unknown): void
}

export interface MobileRepositories {
  activities: ActivityRepository
  focusSessions: FocusSessionRepository
  dailyNotes: DailyNoteRepository
  weeklyGoals: WeeklyGoalRepository
  appSettings: AppSettingsRepository
  notifications: NotificationRepository
  data: DataRepository
}

export function createRepositories(database: AppDatabase): MobileRepositories {
  return {
    activities: {
      list: () => database.select().from(activities).orderBy(asc(activities.name)).all(),
      getById: (id) =>
        database.select().from(activities).where(eq(activities.id, id)).get(),
      getByName: (name) =>
        database.select().from(activities).where(eq(activities.name, name)).get(),
      create: (input) => database.insert(activities).values(input).returning().get() as Activity,
      update: (id, changes) =>
        database
          .update(activities)
          .set(changes)
          .where(eq(activities.id, id))
          .returning()
          .get(),
      delete: (id) => {
        database.delete(activities).where(eq(activities.id, id)).run()
      },
    },
    focusSessions: {
      list: () => database.select().from(focusSessions).orderBy(desc(focusSessions.activityDate)).all(),
      listWithActivities: () => {
        const activityMap = new Map(
          database.select().from(activities).all().map((activity) => [activity.id, activity]),
        )

        return database
          .select()
          .from(focusSessions)
          .orderBy(desc(focusSessions.activityDate), desc(focusSessions.id))
          .all()
          .flatMap((session) => {
            const activity = activityMap.get(session.activityId)
            if (!activity) return []

            return [{
              activityDate: session.activityDate,
              activityName: activity.name,
              color: activity.color,
              icon: activity.icon as FocusSessionRow['icon'],
              durationMinutes: session.durationMinutes,
              startedAt: session.startedAt,
              endedAt: session.endedAt,
              note: session.note,
            }]
          })
      },
      listByDate: (activityDate) =>
        database
          .select()
          .from(focusSessions)
          .where(eq(focusSessions.activityDate, activityDate))
          .orderBy(asc(focusSessions.id))
          .all(),
      listBetween: (from, to) =>
        database
          .select()
          .from(focusSessions)
          .where(and(gte(focusSessions.activityDate, from), lte(focusSessions.activityDate, to)))
          .orderBy(asc(focusSessions.activityDate), asc(focusSessions.id))
          .all(),
      getById: (id) =>
        database.select().from(focusSessions).where(eq(focusSessions.id, id)).get(),
      create: (input) =>
        database.insert(focusSessions).values(input).returning().get() as FocusSession,
      update: (id, changes) =>
        database
          .update(focusSessions)
          .set(changes)
          .where(eq(focusSessions.id, id))
          .returning()
          .get(),
      delete: (id) => {
        database.delete(focusSessions).where(eq(focusSessions.id, id)).run()
      },
    },
    dailyNotes: {
      listBetween: (from, to) =>
        database
          .select()
          .from(dailyNotes)
          .where(and(gte(dailyNotes.activityDate, from), lte(dailyNotes.activityDate, to)))
          .orderBy(asc(dailyNotes.activityDate))
          .all(),
      getByDate: (activityDate) =>
        database.select().from(dailyNotes).where(eq(dailyNotes.activityDate, activityDate)).get(),
      upsert: (input) => {
        database
          .insert(dailyNotes)
          .values(input)
          .onConflictDoUpdate({
            target: dailyNotes.activityDate,
            set: { note: input.note },
          })
          .run()

        return database
          .select()
          .from(dailyNotes)
          .where(eq(dailyNotes.activityDate, input.activityDate))
          .get() as DailyNote
      },
      deleteByDate: (activityDate) => {
        database.delete(dailyNotes).where(eq(dailyNotes.activityDate, activityDate)).run()
      },
    },
    weeklyGoals: {
      list: () => database.select().from(weeklyGoals).orderBy(desc(weeklyGoals.weekStart)).all(),
      getByWeekStart: (weekStart) =>
        database.select().from(weeklyGoals).where(eq(weeklyGoals.weekStart, weekStart)).get(),
      upsert: (input) => {
        database
          .insert(weeklyGoals)
          .values(input)
          .onConflictDoUpdate({
            target: weeklyGoals.weekStart,
            set: { targetMinutes: input.targetMinutes },
          })
          .run()

        return database
          .select()
          .from(weeklyGoals)
          .where(eq(weeklyGoals.weekStart, input.weekStart))
          .get() as WeeklyGoal
      },
      update: (id, changes) =>
        database
          .update(weeklyGoals)
          .set(changes)
          .where(eq(weeklyGoals.id, id))
          .returning()
          .get(),
      delete: (id) => {
        database.delete(weeklyGoals).where(eq(weeklyGoals.id, id)).run()
      },
    },
    appSettings: {
      get: () => database.select().from(appSettings).where(eq(appSettings.id, 1)).get(),
      update: (changes) =>
        database
          .update(appSettings)
          .set(changes)
          .where(eq(appSettings.id, 1))
          .returning()
          .get(),
    },
    notifications: {
      list: (limit = 40) =>
        database
          .select()
          .from(notifications)
          .orderBy(desc(notifications.createdAt), desc(notifications.id))
          .limit(limit)
          .all(),
      getByEventKey: (eventKey) =>
        database
          .select()
          .from(notifications)
          .where(eq(notifications.eventKey, eventKey))
          .get(),
      create: (input) =>
        database.insert(notifications).values(input).returning().get() as Notification,
      unreadCount: () =>
        database
          .select({ id: notifications.id })
          .from(notifications)
          .where(isNull(notifications.readAt))
          .all().length,
      markRead: (id, readAt = new Date().toISOString()) => {
        database
          .update(notifications)
          .set({ readAt })
          .where(eq(notifications.id, id))
          .run()
      },
      markAllRead: (readAt = new Date().toISOString()) => {
        database
          .update(notifications)
          .set({ readAt })
          .where(isNull(notifications.readAt))
          .run()
      },
    },
    data: {
      export: () => ({
        exportedAt: new Date().toISOString(),
        settings: database.select().from(appSettings).where(eq(appSettings.id, 1)).get() ?? null,
        activities: database.select().from(activities).orderBy(asc(activities.id)).all(),
        focusSessions: database.select().from(focusSessions).orderBy(asc(focusSessions.id)).all(),
        dailyNotes: database.select().from(dailyNotes).orderBy(asc(dailyNotes.activityDate)).all(),
        weeklyGoals: database.select().from(weeklyGoals).orderBy(asc(weeklyGoals.weekStart)).all(),
        notifications: database.select().from(notifications).orderBy(asc(notifications.id)).all(),
      }),
      replace: (input) => {
        const backup = parseFocusFlowBackup(input)
        const settings = backup.settings
          ? { ...backup.settings, id: 1 }
          : { ...DEFAULT_APP_SETTINGS }

        database.transaction((tx) => {
          tx.delete(focusSessions).run()
          tx.delete(dailyNotes).run()
          tx.delete(weeklyGoals).run()
          tx.delete(notifications).run()
          tx.delete(activities).run()
          tx.delete(appSettings).run()

          if (backup.activities.length) tx.insert(activities).values(backup.activities).run()
          if (backup.focusSessions.length) {
            tx.insert(focusSessions).values(backup.focusSessions).run()
          }
          if (backup.dailyNotes.length) tx.insert(dailyNotes).values(backup.dailyNotes).run()
          if (backup.weeklyGoals.length) tx.insert(weeklyGoals).values(backup.weeklyGoals).run()
          if (backup.notifications.length) tx.insert(notifications).values(backup.notifications).run()
          tx.insert(appSettings).values(settings).run()
        })
      },
    },
  }
}

export const repositories = createRepositories(db)
