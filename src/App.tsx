import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadCloud, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { fetchWeek, listWeeks, saveWeek, uploadWeek } from '@/lib/api'
import type { DaySchedule, EventItem, Schedule } from '@/lib/types'
import { cn } from '@/lib/utils'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const emptyDay = (date = '00000000'): DaySchedule => ({
  date,
  events: [],
})

export default function App() {
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [compactView, setCompactView] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const days = useMemo(() => {
    if (!schedule) {
      return Array.from({ length: 7 }, () => emptyDay())
    }
    return schedule.days
  }, [schedule])

  const refreshWeeks = async () => {
    const available = await listWeeks()
    setWeeks(available)
    return available
  }

  const loadWeek = async (weekId: string) => {
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await fetchWeek(weekId)
      setSchedule(data)
      setSelectedWeek(weekId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load week')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await uploadWeek(file)
      setSchedule(data)
      setSelectedWeek(data.weekId)
      await refreshWeeks()
      setMessage('Week uploaded and parsed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!schedule) {
      setError('Load or upload a week before saving.')
      return
    }
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await saveWeek(schedule)
      setSchedule(data)
      setMessage('Week saved back to disk.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const updateEvent = (
    dayIndex: number,
    eventIndex: number,
    field: keyof EventItem,
    value: string
  ) => {
    if (!schedule) return
    setSchedule((prev) => {
      if (!prev) return prev
      const updatedDays = prev.days.map((day, index) => {
        if (index !== dayIndex) return day
        const updatedEvents = day.events.map((event, eIndex) =>
          eIndex === eventIndex ? { ...event, [field]: value } : event
        )
        return { ...day, events: updatedEvents }
      })
      return { ...prev, days: updatedDays }
    })
  }

  const addEvent = (dayIndex: number) => {
    if (!schedule) return
    const newEvent: EventItem = {
      start: '09:00',
      end: '10:00',
      title: 'New event',
      note: '',
    }
    setSchedule((prev) => {
      if (!prev) return prev
      const updatedDays = prev.days.map((day, index) =>
        index === dayIndex
          ? { ...day, events: [...day.events, newEvent] }
          : day
      )
      return { ...prev, days: updatedDays }
    })
  }

  const removeEvent = (dayIndex: number, eventIndex: number) => {
    if (!schedule) return
    setSchedule((prev) => {
      if (!prev) return prev
      const updatedDays = prev.days.map((day, index) => {
        if (index !== dayIndex) return day
        const updatedEvents = day.events.filter((_, idx) => idx !== eventIndex)
        return { ...day, events: updatedEvents }
      })
      return { ...prev, days: updatedDays }
    })
  }

  useEffect(() => {
    refreshWeeks().catch(() => {
      setError('Unable to reach the API server.')
    })
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="theme min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_55%,_#f1f5f9)] text-slate-900">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-16 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />
        <div
          className={cn(
            'relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4',
            compactView && 'fit-screen'
          )}
        >
          <header className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Calendar MD
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Weekly schedule from Markdown
            </h1>
          </header>

          <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <Card className="border-slate-200/70 bg-white/80 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Selected week
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedWeek || 'None loaded yet'}
                  </p>
                  {weeks.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No week files found yet. Upload a .md file to begin.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={selectedWeek}
                    onValueChange={(value) => loadWeek(value)}
                    disabled={isLoading || weeks.length === 0}
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue placeholder="Select a week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weeks.map((week) => (
                        <SelectItem key={week} value={week}>
                          {week}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        handleUpload(file)
                        event.target.value = ''
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <UploadCloud className="mr-2 size-4" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompactView((prev) => !prev)}
                  >
                    {compactView ? 'Normal' : 'Compact'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || isLoading || !schedule}
                  >
                    <Save className="mr-2 size-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
              {(message || error || isLoading) && (
                <div
                  className={`border-t px-4 py-2 text-xs ${
                    error
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : message
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {error || message || 'Loading week data...'}
                </div>
              )}
            </Card>

            <section className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {days.map((day, index) => (
                <Card
                  key={`${day.date}-${index}`}
                  className="flex min-h-0 min-w-0 flex-col border-slate-200/70 bg-white/70 p-2"
                >
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-xs font-semibold text-slate-900">
                      {dayLabels[index]}
                    </h2>
                    <span className="text-[0.65rem] text-slate-500">{day.date}</span>
                  </div>
                  <div className="mt-2 flex-1 min-w-0 space-y-2">
                    {day.events.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[0.7rem] text-slate-500">
                        No events yet
                      </div>
                    )}
                    {day.events.map((event, eventIndex) => (
                      <div
                        key={`${day.date}-${eventIndex}`}
                        className="min-w-0 space-y-2 rounded-xl border border-slate-200/80 bg-white/80 p-2 text-[0.7rem]"
                      >
                        <div className="grid min-w-0 grid-cols-2 gap-2">
                          <Input
                            type="time"
                            className="h-8 w-full min-w-0 px-2 pr-6 text-xs tabular-nums"
                            value={event.start}
                            onChange={(e) =>
                              updateEvent(index, eventIndex, 'start', e.target.value)
                            }
                            placeholder="09:00"
                          />
                          <Input
                            type="time"
                            className="h-8 w-full min-w-0 px-2 pr-6 text-xs tabular-nums"
                            value={event.end}
                            onChange={(e) =>
                              updateEvent(index, eventIndex, 'end', e.target.value)
                            }
                            placeholder="10:30"
                          />
                        </div>
                        <Textarea
                          rows={2}
                          className="min-h-8 resize-none break-words text-[0.7rem] leading-tight [overflow-wrap:anywhere]"
                          value={event.title}
                          onChange={(e) =>
                            updateEvent(index, eventIndex, 'title', e.target.value)
                          }
                          placeholder="Event title"
                        />
                        <Textarea
                          rows={2}
                          className="min-h-8 resize-none break-words text-[0.7rem] leading-tight [overflow-wrap:anywhere]"
                          value={event.note ?? ''}
                          onChange={(e) =>
                            updateEvent(index, eventIndex, 'note', e.target.value)
                          }
                          placeholder="Optional note"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full justify-center text-[0.7rem] text-rose-600 hover:text-rose-700"
                          onClick={() => removeEvent(index, eventIndex)}
                        >
                          <Trash2 className="mr-2 size-3" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-[0.7rem]"
                    onClick={() => addEvent(index)}
                    disabled={!schedule}
                  >
                    <Plus className="mr-2 size-3" />
                    Add event
                  </Button>
                </Card>
              ))}
            </section>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
