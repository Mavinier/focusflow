import { createDayData, SAMPLE_LAST_TRACKED_DATE } from '../src/data/activityData'
import { db } from './db/client'
import {
  activities,
  appSettings,
  dailyNotes,
  focusSessions,
  weeklyGoals,
} from './db/schema'
import { DEFAULT_WEEKLY_TARGET_MINUTES, getWeekStart } from './utils/week'

const dayData = createDayData()
const existingActivity = db.select({ id: activities.id }).from(activities).limit(1).get()

if (existingActivity) {
  console.log('SQLite database already contains activity data; skipping seed.')
} else {
  db.transaction((tx) => {
    const activityDefinitions = Array.from(
      new Map(
        Object.values(dayData)
          .flatMap((record) => record.activities)
          .map((activity) => [
            activity.name,
            {
              name: activity.name,
              color: activity.color,
              icon: activity.icon,
            },
          ]),
      ).values(),
    )

    const insertedActivities = tx
      .insert(activities)
      .values(activityDefinitions)
      .returning({ id: activities.id, name: activities.name })
      .all()
    const activityIds = new Map(insertedActivities.map((activity) => [activity.name, activity.id]))
    const sessionValues = []
    const noteValues = []

    for (const record of Object.values(dayData)) {
      noteValues.push({
        activityDate: record.date,
        note: record.note,
      })

      let cursorMinutes = 9 * 60
      for (const activity of record.activities) {
        const activityId = activityIds.get(activity.name)
        if (!activityId) continue

        const startedAt = `${record.date}T${formatTime(cursorMinutes)}:00`
        cursorMinutes += activity.duration
        const endedAt = `${record.date}T${formatTime(cursorMinutes)}:00`

        sessionValues.push({
          activityId,
          activityDate: record.date,
          startedAt,
          endedAt,
          durationMinutes: activity.duration,
        })
      }
    }

    tx.insert(focusSessions).values(sessionValues).run()
    tx.insert(dailyNotes).values(noteValues).run()
  })

  console.log(`Seeded ${Object.keys(dayData).length} activity days into SQLite.`)
}

const existingWeeklyGoal = db.select({ id: weeklyGoals.id }).from(weeklyGoals).limit(1).get()

if (!existingWeeklyGoal) {
  db.insert(weeklyGoals)
    .values({
      weekStart: getWeekStart(SAMPLE_LAST_TRACKED_DATE),
      targetMinutes: DEFAULT_WEEKLY_TARGET_MINUTES,
    })
    .run()
  console.log('Created the default weekly focus goal.')
}

const existingSettings = db.select({ id: appSettings.id }).from(appSettings).limit(1).get()

if (!existingSettings) {
  db.insert(appSettings)
    .values({
      id: 1,
      displayName: 'Marlon Moura',
      defaultWeeklyTargetMinutes: DEFAULT_WEEKLY_TARGET_MINUTES,
      weekStartsOn: 1,
      theme: 'dark',
      notificationsEnabled: 1,
      goalNotificationsEnabled: 1,
      streakNotificationsEnabled: 1,
      inactivityNotificationsEnabled: 1,
      inactivityThresholdDays: 3,
    })
    .run()
  console.log('Created the default FocusFlow settings.')
}

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

