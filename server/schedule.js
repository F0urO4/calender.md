import { addDays, format, getDay, isValid, parse } from 'date-fns'

const WEEK_HEADER = /^#\s*WEEK\s+(\d{8})\s*$/
const DAY_HEADER = /^##\s*(\d{8})\s*$/
const EVENT_LINE = /^-\s*(\d{2}:\d{2})-(\d{2}:\d{2})\s+(.+?)(?:\s+\((.+)\))?$/

const TIME_RE = /^\d{2}:\d{2}$/

const toDate = (id) => {
  if (!/^\d{8}$/.test(id)) {
    throw new Error(`Invalid date id: ${id}`)
  }
  const parsed = parse(id, 'yyyyMMdd', new Date())
  if (!isValid(parsed) || format(parsed, 'yyyyMMdd') !== id) {
    throw new Error(`Invalid date id: ${id}`)
  }
  return parsed
}

const timeToMinutes = (value) => {
  if (!TIME_RE.test(value)) {
    throw new Error(`Invalid time: ${value}`)
  }
  const [hours, minutes] = value.split(':').map(Number)
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid time: ${value}`)
  }
  return hours * 60 + minutes
}

const expectedWeekDays = (weekId) => {
  const start = toDate(weekId)
  if (getDay(start) !== 1) {
    throw new Error(`Week ${weekId} must start on a Monday`)
  }
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), 'yyyyMMdd')
  )
}

const ensureWeekDays = (weekId, days) => {
  const expected = expectedWeekDays(weekId)
  const dates = days.map((day) => day.date)
  const uniqueDates = new Set(dates)
  if (uniqueDates.size !== 7) {
    throw new Error('Week must include exactly 7 unique days')
  }
  for (const date of expected) {
    if (!uniqueDates.has(date)) {
      throw new Error(`Missing day ${date} in week ${weekId}`)
    }
  }
  return expected
}

const normalizeEvents = (events, context) => {
  return events
    .map((event) => {
      const startMinutes = timeToMinutes(event.start)
      const endMinutes = timeToMinutes(event.end)
      if (startMinutes >= endMinutes) {
        throw new Error(`Invalid time range in ${context}: ${event.start}-${event.end}`)
      }
      return {
        start: event.start,
        end: event.end,
        title: event.title.trim(),
        note: event.note?.trim() || undefined,
        sortKey: startMinutes,
      }
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...event }) => event)
}

export const parseSchedule = (markdown) => {
  const lines = markdown.split(/\r?\n/)
  let weekId = null
  let currentDay = null
  const daysMap = new Map()

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const weekMatch = line.match(WEEK_HEADER)
    if (weekMatch) {
      if (weekId) {
        throw new Error('Multiple week headers found')
      }
      weekId = weekMatch[1]
      continue
    }

    const dayMatch = line.match(DAY_HEADER)
    if (dayMatch) {
      if (!weekId) {
        throw new Error('Week header must appear before day sections')
      }
      currentDay = dayMatch[1]
      if (!daysMap.has(currentDay)) {
        daysMap.set(currentDay, [])
      }
      continue
    }

    const eventMatch = line.match(EVENT_LINE)
    if (eventMatch) {
      if (!currentDay) {
        throw new Error('Event line found before a day section')
      }
      const [, start, end, title, note] = eventMatch
      if (!title.trim()) {
        throw new Error(`Event title missing in ${currentDay}`)
      }
      const events = daysMap.get(currentDay)
      events.push({ start, end, title: title.trim(), note })
      continue
    }
  }

  if (!weekId) {
    throw new Error('Missing week header')
  }

  const days = Array.from(daysMap.entries()).map(([date, events]) => ({
    date,
    events,
  }))

  const expected = ensureWeekDays(weekId, days)
  const normalizedDays = expected.map((date) => {
    const events = daysMap.get(date) || []
    return {
      date,
      events: normalizeEvents(events, date),
    }
  })

  return { weekId, days: normalizedDays }
}

export const validateScheduleInput = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid schedule payload')
  }
  const weekId = input.weekId
  if (typeof weekId !== 'string' || !/^\d{8}$/.test(weekId)) {
    throw new Error('weekId must be an 8 digit date')
  }
  if (!Array.isArray(input.days)) {
    throw new Error('days must be an array')
  }

  const days = input.days.map((day) => {
    if (!day || typeof day !== 'object') {
      throw new Error('Each day must be an object')
    }
    if (typeof day.date !== 'string' || !/^\d{8}$/.test(day.date)) {
      throw new Error('Day date must be an 8 digit date')
    }
    if (!Array.isArray(day.events)) {
      throw new Error(`Events for ${day.date} must be an array`)
    }
    const events = day.events.map((event) => {
      if (!event || typeof event !== 'object') {
        throw new Error(`Event in ${day.date} must be an object`)
      }
      if (typeof event.start !== 'string' || typeof event.end !== 'string') {
        throw new Error(`Event times in ${day.date} must be strings`)
      }
      if (typeof event.title !== 'string' || !event.title.trim()) {
        throw new Error(`Event title missing in ${day.date}`)
      }
      if (event.note && typeof event.note !== 'string') {
        throw new Error(`Event note must be a string in ${day.date}`)
      }
      return {
        start: event.start,
        end: event.end,
        title: event.title.trim(),
        note: event.note?.trim() || undefined,
      }
    })
    return {
      date: day.date,
      events: normalizeEvents(events, day.date),
    }
  })

  const expected = ensureWeekDays(weekId, days)
  const daysMap = new Map(days.map((day) => [day.date, day]))
  const normalizedDays = expected.map((date) => {
    const day = daysMap.get(date)
    return {
      date,
      events: day ? day.events : [],
    }
  })

  return { weekId, days: normalizedDays }
}

export const serializeSchedule = (schedule) => {
  const lines = [`# WEEK ${schedule.weekId}`, '']
  for (const day of schedule.days) {
    lines.push(`## ${day.date}`)
    if (day.events.length === 0) {
      lines.push('')
      continue
    }
    for (const event of day.events) {
      const note = event.note ? ` (${event.note})` : ''
      lines.push(`- ${event.start}-${event.end} ${event.title}${note}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}
