import type {
  Activity,
  AppSettings,
  DailyNote,
  FocusSession,
  Notification,
  WeeklyGoal,
} from '../db/schema'

export type FocusFlowBackup = {
  exportedAt: string
  settings: AppSettings | null
  activities: Activity[]
  focusSessions: FocusSession[]
  dailyNotes: DailyNote[]
  weeklyGoals: WeeklyGoal[]
  notifications: Notification[]
}

type RecordValue = Record<string, unknown>

export function parseFocusFlowBackup(value: unknown): FocusFlowBackup {
  if (!isRecord(value)) {
    throw new Error('The selected file is not a valid FocusFlow backup.')
  }

  const backup = {
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    settings: value.settings === undefined || value.settings === null
      ? null
      : parseSettings(value.settings),
    activities: parseArray(value.activities, 'activities', parseActivity),
    focusSessions: parseArray(value.focusSessions, 'focusSessions', parseFocusSession),
    dailyNotes: parseArray(value.dailyNotes, 'dailyNotes', parseDailyNote),
    weeklyGoals: parseArray(value.weeklyGoals, 'weeklyGoals', parseWeeklyGoal),
    notifications: value.notifications === undefined
      ? []
      : parseArray(value.notifications, 'notifications', parseNotification),
  }

  validateReferences(backup)
  return backup
}

function parseSettings(value: unknown): AppSettings {
  if (!isRecord(value)) throw new Error('The backup settings are invalid.')

  return {
    id: positiveInteger(value.id, 'settings.id'),
    displayName: nonEmptyString(value.displayName, 'settings.displayName'),
    defaultWeeklyTargetMinutes: positiveInteger(
      value.defaultWeeklyTargetMinutes,
      'settings.defaultWeeklyTargetMinutes',
    ),
    weekStartsOn: integerInRange(value.weekStartsOn, 0, 6, 'settings.weekStartsOn'),
    theme: nonEmptyString(value.theme, 'settings.theme'),
    notificationsEnabled: booleanInteger(value.notificationsEnabled, 'settings.notificationsEnabled'),
    goalNotificationsEnabled: booleanInteger(
      value.goalNotificationsEnabled,
      'settings.goalNotificationsEnabled',
    ),
    streakNotificationsEnabled: booleanInteger(
      value.streakNotificationsEnabled,
      'settings.streakNotificationsEnabled',
    ),
    inactivityNotificationsEnabled: booleanInteger(
      value.inactivityNotificationsEnabled,
      'settings.inactivityNotificationsEnabled',
    ),
    inactivityThresholdDays: positiveInteger(
      value.inactivityThresholdDays,
      'settings.inactivityThresholdDays',
    ),
  }
}

function parseActivity(value: unknown, index: number): Activity {
  if (!isRecord(value)) throw new Error(`The backup activity at row ${index + 1} is invalid.`)
  return {
    id: positiveInteger(value.id, `activities[${index}].id`),
    name: nonEmptyString(value.name, `activities[${index}].name`),
    color: nonEmptyString(value.color, `activities[${index}].color`),
    icon: nonEmptyString(value.icon, `activities[${index}].icon`) as Activity['icon'],
    isActive: value.isActive === undefined
      ? 1
      : booleanInteger(value.isActive, `activities[${index}].isActive`),
  }
}

function parseFocusSession(value: unknown, index: number): FocusSession {
  if (!isRecord(value)) throw new Error(`The backup session at row ${index + 1} is invalid.`)
  return {
    id: positiveInteger(value.id, `focusSessions[${index}].id`),
    activityId: positiveInteger(value.activityId, `focusSessions[${index}].activityId`),
    activityDate: dateKey(value.activityDate, `focusSessions[${index}].activityDate`),
    startedAt: nullableString(value.startedAt, `focusSessions[${index}].startedAt`),
    endedAt: nullableString(value.endedAt, `focusSessions[${index}].endedAt`),
    durationMinutes: positiveInteger(
      value.durationMinutes,
      `focusSessions[${index}].durationMinutes`,
    ),
    note: nullableString(value.note, `focusSessions[${index}].note`),
  }
}

function parseDailyNote(value: unknown, index: number): DailyNote {
  if (!isRecord(value)) throw new Error(`The backup note at row ${index + 1} is invalid.`)
  return {
    id: positiveInteger(value.id, `dailyNotes[${index}].id`),
    activityDate: dateKey(value.activityDate, `dailyNotes[${index}].activityDate`),
    note: nonEmptyString(value.note, `dailyNotes[${index}].note`),
  }
}

function parseWeeklyGoal(value: unknown, index: number): WeeklyGoal {
  if (!isRecord(value)) throw new Error(`The backup goal at row ${index + 1} is invalid.`)
  return {
    id: positiveInteger(value.id, `weeklyGoals[${index}].id`),
    weekStart: dateKey(value.weekStart, `weeklyGoals[${index}].weekStart`),
    targetMinutes: positiveInteger(value.targetMinutes, `weeklyGoals[${index}].targetMinutes`),
  }
}

function parseNotification(value: unknown, index: number): Notification {
  if (!isRecord(value)) throw new Error(`The backup notification at row ${index + 1} is invalid.`)
  return {
    id: positiveInteger(value.id, `notifications[${index}].id`),
    eventKey: nonEmptyString(value.eventKey, `notifications[${index}].eventKey`),
    type: nonEmptyString(value.type, `notifications[${index}].type`),
    title: nonEmptyString(value.title, `notifications[${index}].title`),
    message: nonEmptyString(value.message, `notifications[${index}].message`),
    href: nonEmptyString(value.href, `notifications[${index}].href`),
    createdAt: nonEmptyString(value.createdAt, `notifications[${index}].createdAt`),
    readAt: nullableString(value.readAt, `notifications[${index}].readAt`),
  }
}

function parseArray<T>(
  value: unknown,
  name: string,
  parser: (value: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(value)) throw new Error(`The backup field "${name}" must be an array.`)
  return value.map(parser)
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`The backup field "${name}" is invalid.`)
  return value
}

function nullableString(value: unknown, name: string) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new Error(`The backup field "${name}" is invalid.`)
  }
  return value ?? null
}

function positiveInteger(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`The backup field "${name}" is invalid.`)
  }
  return value
}

function integerInRange(value: unknown, minimum: number, maximum: number, name: string) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`The backup field "${name}" is invalid.`)
  }
  return value
}

function booleanInteger(value: unknown, name: string) {
  if (value !== 0 && value !== 1) throw new Error(`The backup field "${name}" is invalid.`)
  return value
}

function dateKey(value: unknown, name: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`The backup field "${name}" is invalid.`)
  }
  const parsed = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`The backup field "${name}" is invalid.`)
  }
  return value
}

function validateReferences(backup: FocusFlowBackup) {
  assertUnique(backup.activities.map((activity) => activity.id), 'activity IDs')
  assertUnique(backup.focusSessions.map((session) => session.id), 'session IDs')
  assertUnique(backup.dailyNotes.map((note) => note.id), 'note IDs')
  assertUnique(backup.weeklyGoals.map((goal) => goal.id), 'goal IDs')
  assertUnique(backup.notifications.map((notification) => notification.id), 'notification IDs')
  assertUnique(
    backup.activities.map((activity) => activity.name),
    'activity names',
  )
  assertUnique(
    backup.weeklyGoals.map((goal) => goal.weekStart),
    'goal week starts',
  )
  assertUnique(
    backup.dailyNotes.map((note) => note.activityDate),
    'note dates',
  )
  assertUnique(
    backup.notifications.map((notification) => notification.eventKey),
    'notification event keys',
  )

  const activityIds = new Set(backup.activities.map((activity) => activity.id))
  if (backup.focusSessions.some((session) => !activityIds.has(session.activityId))) {
    throw new Error('The backup contains a session for an unknown activity area.')
  }
}

function assertUnique(values: (number | string)[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`The backup contains duplicate ${label}.`)
  }
}
