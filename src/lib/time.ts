const TIME_24H = /^(\d{1,2}):(\d{2})$/
const TIME_12H = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/
const padMinutes = (minutes: number) => minutes.toString().padStart(2, '0')
const padHours = (hours: number) => hours.toString().padStart(2, '0')

export const formatTime12 = (time24: string) => {
  const match = time24.match(TIME_24H)
  if (!match) return time24
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return time24

  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${padMinutes(minutes)} ${period}`
}

export const parseTimeTo24 = (value: string) => {
  const trimmed = value.trim()
  const match12 = trimmed.match(TIME_12H)
  if (match12) {
    const hours = Number(match12[1])
    const minutes = Number(match12[2])
    if (hours < 1 || hours > 12 || minutes > 59) return null
    const period = match12[3].toUpperCase()
    const base = hours % 12
    const hour24 = period === 'PM' ? base + 12 : base
    return `${padHours(hour24)}:${padMinutes(minutes)}`
  }

  const match24 = trimmed.match(TIME_24H)
  if (match24) {
    const hours = Number(match24[1])
    const minutes = Number(match24[2])
    if (hours > 23 || minutes > 59) return null
    return `${padHours(hours)}:${padMinutes(minutes)}`
  }

  return null
}
