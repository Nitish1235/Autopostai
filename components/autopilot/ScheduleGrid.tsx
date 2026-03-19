'use client'

import { Plus, X, Ban } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils/cn'
import type { Platform, WeeklySchedule, ScheduleSlot } from '@/types'

interface ScheduleGridProps {
  schedule: WeeklySchedule
  onScheduleChange: (schedule: WeeklySchedule) => void
  aiOptimize: boolean
  onAiOptimizeChange: (val: boolean) => void
}

const DAYS: { key: keyof WeeklySchedule; label: string; short: string; jsDay: number }[] = [
  { key: 'monday',    label: 'Monday',    short: 'Mon', jsDay: 1 },
  { key: 'tuesday',  label: 'Tuesday',   short: 'Tue', jsDay: 2 },
  { key: 'wednesday',label: 'Wednesday', short: 'Wed', jsDay: 3 },
  { key: 'thursday', label: 'Thursday',  short: 'Thu', jsDay: 4 },
  { key: 'friday',   label: 'Friday',    short: 'Fri', jsDay: 5 },
  { key: 'saturday', label: 'Saturday',  short: 'Sat', jsDay: 6 },
  { key: 'sunday',   label: 'Sunday',    short: 'Sun', jsDay: 0 },
]

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube',   label: 'YouTube' },
  { id: 'x',        label: 'X' },
]

// Returns true if a slot time (HH:MM UTC) on the given weekday is in the past
function isSlotInPast(jsDay: number, timeUtc: string): boolean {
  const now = new Date()
  const nowDay = now.getUTCDay()   // 0=Sun…6=Sat
  const [hh, mm] = timeUtc.split(':').map(Number)
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const slotMinutes = hh * 60 + mm

  if (jsDay === nowDay) return slotMinutes <= nowMinutes
  // Check if the day already passed this week (week starts Mon)
  const daysDiff = (jsDay - nowDay + 7) % 7
  return daysDiff > 4 // more than 4 days away means it was earlier this week
}

// Min time for today's slots (current UTC time)
function getTodayMinTime(): string {
  const now = new Date()
  const h = String(now.getUTCHours()).padStart(2, '0')
  const m = String(now.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function ScheduleGrid({
  schedule,
  onScheduleChange,
  aiOptimize,
  onAiOptimizeChange,
}: ScheduleGridProps) {
  const updateSlot = (
    day: keyof WeeklySchedule,
    index: number,
    partial: Partial<ScheduleSlot>
  ) => {
    const updated = { ...schedule }
    const slots = [...updated[day]]
    slots[index] = { ...slots[index], ...partial }
    updated[day] = slots
    onScheduleChange(updated)
  }

  const addSlot = (day: keyof WeeklySchedule) => {
    const updated = { ...schedule }
    const slots = [...updated[day]]
    if (slots.length >= 3) return
    slots.push({ time: '12:00', platform: 'x', enabled: true })
    updated[day] = slots
    onScheduleChange(updated)
  }

  const removeSlot = (day: keyof WeeklySchedule, index: number) => {
    const updated = { ...schedule }
    updated[day] = updated[day].filter((_, i) => i !== index)
    onScheduleChange(updated)
  }

  const todayMinTime = getTodayMinTime()

  return (
    <div className="space-y-4">
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-[8px]">
        <p className="text-[12px] text-indigo-400 font-medium">
          ⏱️ All schedule times are in UTC
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          Slots with a 🚫 badge have already passed and will not run until next week.
        </p>
      </div>

      {/* AI Optimize toggle */}
      <div className="flex items-center justify-between p-3 rounded-[8px] bg-[var(--accent-subtle)] border border-[var(--accent-border)]">
        <div>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">AI Optimize Times</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Based on your last 30 days</p>
        </div>
        <Toggle checked={aiOptimize} onChange={onAiOptimizeChange} size="sm" />
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const slots = schedule[day.key] || []
          const isToday = new Date().getUTCDay() === day.jsDay
          return (
            <div key={day.key} className="space-y-1.5">
              <p className={cn(
                'text-[10px] font-semibold uppercase tracking-wider text-center',
                isToday ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
              )}>
                {day.short}
                {isToday && <span className="block text-[8px] normal-case tracking-normal">Today</span>}
              </p>

              {slots.map((slot, si) => {
                const past = isSlotInPast(day.jsDay, slot.time)
                return (
                  <div
                    key={si}
                    className={cn(
                      'p-1.5 rounded-[6px] border text-center transition-colors relative',
                      past
                        ? 'border-[var(--danger)]/30 bg-[var(--danger)]/5 opacity-60'
                        : slot.enabled
                        ? 'border-[var(--accent-border)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border)] bg-[var(--bg-card)] opacity-50'
                    )}
                  >
                    {/* Past / Banned badge */}
                    {past && (
                      <div className="absolute -top-1.5 -right-1.5 z-10">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--danger)] text-white shadow-sm" title="This slot has already passed this week">
                          <Ban size={9} strokeWidth={2.5} />
                        </span>
                      </div>
                    )}

                    <input
                      type="time"
                      value={slot.time}
                      min={isToday ? todayMinTime : undefined}
                      onChange={(e) => updateSlot(day.key, si, { time: e.target.value })}
                      className="w-full text-[10px] text-center bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer"
                    />
                    <select
                      value={slot.platform}
                      onChange={(e) => updateSlot(day.key, si, { platform: e.target.value as Platform })}
                      className="w-full text-[9px] bg-transparent text-[var(--text-secondary)] mt-0.5 focus:outline-none cursor-pointer"
                    >
                      {PLATFORMS.map((p) => (
                        <option 
                          key={p.id} 
                          value={p.id}
                          className="bg-[#1e1e24] text-white" 
                        >
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between mt-1">
                      <Toggle
                        checked={slot.enabled}
                        onChange={(v) => updateSlot(day.key, si, { enabled: v })}
                        size="sm"
                      />
                      <button
                        onClick={() => removeSlot(day.key, si)}
                        className="p-0.5 text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {slots.length < 3 && (
                <button
                  onClick={() => addSlot(day.key)}
                  className="w-full py-1.5 border border-dashed border-[var(--border)] rounded-[6px] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Plus size={10} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ScheduleGrid }
