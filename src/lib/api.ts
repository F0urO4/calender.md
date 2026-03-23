import type { Schedule } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5174'

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data.error || 'Request failed'
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const listWeeks = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/weeks`)
  const data = await handleResponse<{ weeks: string[] }>(response)
  return data.weeks
}

export const fetchWeek = async (weekId: string): Promise<Schedule> => {
  const response = await fetch(`${API_URL}/weeks/${weekId}`)
  const data = await handleResponse<{ schedule: Schedule }>(response)
  return data.schedule
}

export const uploadWeek = async (file: File): Promise<Schedule> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_URL}/weeks`, {
    method: 'POST',
    body: formData,
  })
  const data = await handleResponse<{ schedule: Schedule }>(response)
  return data.schedule
}

export const saveWeek = async (schedule: Schedule): Promise<Schedule> => {
  const response = await fetch(`${API_URL}/weeks/${schedule.weekId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schedule),
  })
  const data = await handleResponse<{ schedule: Schedule }>(response)
  return data.schedule
}
