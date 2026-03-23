export type EventItem = {
  start: string
  end: string
  title: string
  note?: string
}

export type DaySchedule = {
  date: string
  events: EventItem[]
}

export type Schedule = {
  weekId: string
  days: DaySchedule[]
}
