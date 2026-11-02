export type Intensity = 'none' | 'low' | 'medium' | 'high' | 'very-high'

export type ActivityIconName =
  | 'code'
  | 'database'
  | 'book'
  | 'work'
  | 'notes'
  | 'fitness'
  | 'design'
  | 'language'
  | 'music'
  | 'personal'

export type Activity = {
  name: string
  duration: number
  color: string
  icon: ActivityIconName
}

export type DayRecord = {
  date: string
  totalMinutes: number
  note: string
  activities: Activity[]
}

export type DayData = Record<string, DayRecord>
