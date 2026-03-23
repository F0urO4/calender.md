import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { UploadCloud, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { formatTime12, parseTimeTo24 } from '@/lib/time'

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
  const exportRef = useRef<HTMLDivElement | null>(null)

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

  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const handleTimeBlur = (
    dayIndex: number,
    eventIndex: number,
    field: 'start' | 'end',
    rawValue: string,
    fallback: string,
    input: HTMLInputElement
  ) => {
    const parsed = parseTimeTo24(rawValue)
    if (!parsed) {
      input.value = formatTime12(fallback)
      return
    }
    updateEvent(dayIndex, eventIndex, field, parsed)
    input.value = formatTime12(parsed)
  }

  const handleExportPdf = async () => {
    const node = exportRef.current
    if (!node) return

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'letter',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 18
    const pxToPt = 72 / 96
    const imgWidthPt = canvas.width * pxToPt
    const imgHeightPt = canvas.height * pxToPt
    const scale = Math.min(
      (pageWidth - margin * 2) / imgWidthPt,
      (pageHeight - margin * 2) / imgHeightPt
    )

    const renderWidth = imgWidthPt * scale
    const renderHeight = imgHeightPt * scale

    const x = (pageWidth - renderWidth) / 2
    const y = margin

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight)
    pdf.save(`week-${selectedWeek || 'schedule'}.pdf`)
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


  useEffect(() => {
    document
      .querySelectorAll<HTMLTextAreaElement>('textarea[data-auto-grow="true"]')
      .forEach(resizeTextarea)
  }, [schedule])

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
          <div className="screen-root no-print">
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
                  <Button variant="outline" size="sm" onClick={handleExportPdf}>
                    Export PDF
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
                    className="day-card flex min-h-0 min-w-0 flex-col border-slate-200/70 bg-white/70 p-2"
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
                          className="event-card min-w-0 space-y-2 rounded-xl border border-slate-200/80 bg-white/80 p-2 text-[0.7rem]"
                        >
                          <div className="min-w-0 space-y-2">
                            {(['start', 'end'] as const).map((field) => (
                              <div key={field} className="min-w-0">
                                <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                                  {field === 'start' ? 'Start' : 'End'}
                                </p>
                                <input
                                  key={`${day.date}-${eventIndex}-${field}-${event[field]}`}
                                  type="text"
                                  className="mt-1 h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs tabular-nums"
                                  defaultValue={formatTime12(event[field])}
                                  onBlur={(e) =>
                                    handleTimeBlur(
                                      index,
                                      eventIndex,
                                      field,
                                      e.target.value,
                                      event[field],
                                      e.currentTarget
                                    )
                                  }
                                  placeholder="4:00 AM"
                                />
                              </div>
                            ))}
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
                            data-auto-grow="true"
                            className="min-h-16 resize-none whitespace-pre-wrap break-words text-[0.7rem] leading-tight [overflow-wrap:anywhere] bg-white/90 border-slate-300/70"
                            value={event.note ?? ''}
                            onChange={(e) =>
                              updateEvent(index, eventIndex, 'note', e.target.value)
                            }
                            onInput={(e) => resizeTextarea(e.currentTarget)}
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
          <section ref={exportRef} className="export-root">
            <div className="export-grid">
              <div className="export-header">
                <div>
                  <p className="export-label">Calendar MD</p>
                  <h2 className="export-title">Weekly schedule</h2>
                </div>
                <div className="export-week">Week {selectedWeek || 'Unloaded'}</div>
              </div>
              <div className="export-days">
                {days.map((day, index) => (
                  <div key={`${day.date}-${index}-export`} className="export-day">
                    <div className="export-day-header">
                      <span className="export-day-name">{dayLabels[index]}</span>
                      <span className="export-day-date">{day.date}</span>
                    </div>
                    {day.events.length === 0 && (
                      <div className="export-empty">No events</div>
                    )}
                    {day.events.map((event, eventIndex) => (
                      <div key={`${day.date}-${eventIndex}-export`} className="export-event">
                        <div className="export-time">
                          {formatTime12(event.start)} — {formatTime12(event.end)}
                        </div>
                        <div className="export-title-text">{event.title}</div>
                        {event.note && (
                          <div className="export-note">{event.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  )
}
