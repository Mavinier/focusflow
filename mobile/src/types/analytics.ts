/**
 * Session-shaped data used by the pure analytics functions.
 *
 * The SQLite table stores activityId and the activity metadata lives in the
 * activities table. A repository query can enrich rows into this shape before
 * passing them to the analytics layer.
 */
export type FocusSessionRow = {
  activityDate: string
  activityName: string
  color: string
  icon?: 'code' | 'database' | 'book' | 'work' | 'notes'
  durationMinutes: number
  startedAt: string | null
  endedAt: string | null
  note: string | null
}

export type DailyNoteRow = {
  activityDate: string
  note: string
}

export type WeeklyGoalRow = {
  weekStart: string
  targetMinutes: number
}
