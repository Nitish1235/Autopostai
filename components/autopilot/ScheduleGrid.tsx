'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Platform, WeeklySchedule, ScheduleSlot } from '@/types'

interface ScheduleGridProps {
  schedule: WeeklySchedule
  onScheduleChange: (schedule: WeeklySchedule) => void
  aiOptimize: boolean
  onAiOptimizeChange: (val: boolean) => void
}

const DAYS: { key: keyof WeeklySchedule; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
]

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
]

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
    slots.push({ time: '12:00', platform: 'tiktok', enabled: true })
    updated[day] = slots
    onScheduleChange(updated)
  }

  const removeSlot = (day: keyof WeeklySchedule, index: number) => {
    const updated = { ...schedule }
    updated[day] = updated[day].filter((_, i) => i !== index)
    onScheduleChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-[8px]">
        <p className="text-[12px] text-indigo-400 font-medium">
          ⏱️ Note: All schedule times are in UTC
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
          Your videos will be published based on the UTC hour matching your settings below.
        </p>
      </div>

      {/* AI Optimize toggle */}
      <div className="flex items-center justify-between p-3 rounded-[8px] bg-[var(--accent-subtle)] border border-[var(--accent-border)]">
        <div>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">
            AI Optimize Times
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Based on your last 30 days of data
          </p>
        </div>
        <Toggle
          checked={aiOptimize}
          onChange={onAiOptimizeChange}
          size="sm"
        />
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const slots = schedule[day.key] || []
          return (
            <div key={day.key} className="space-y-1.5">
              <p className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider text-center">
                {day.short}
              </p>

              {slots.map((slot, si) => (
                <div
                  key={si}
                  className={cn(
                    'p-1.5 rounded-[6px] border text-center transition-colors',
                    slot.enabled
                      ? 'border-[var(--accent-border)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] opacity-50'
                  )}
                >
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) =>
                      updateSlot(day.key, si, { time: e.target.value })
                    }
                    className="w-full text-[10px] text-center bg-transparent text-[var(--text-primary)] focus:outline-none"
                  />
                  <select
                    value={slot.platform}
                    onChange={(e) =>
                      updateSlot(day.key, si, {
                        platform: e.target.value as Platform,
                      })
                    }
                    className="w-full text-[9px] bg-transparent text-[var(--text-secondary)] mt-0.5 focus:outline-none cursor-pointer"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between mt-1">
                    <Toggle
                      checked={slot.enabled}
                      onChange={(v) =>
                        updateSlot(day.key, si, { enabled: v })
                      }
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
              ))}

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
