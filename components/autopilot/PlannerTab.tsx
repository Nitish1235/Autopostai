'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import { useToast } from '@/components/ui/toast'
import type { Platform } from '@/types'

interface ScheduledPost {
  id: string
  title: string
  platforms: Platform[]
  scheduledAt: string
  status: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6AM to 11PM

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthDates(date: Date): Date[][] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const weeks: Date[][] = []
  let current = new Date(firstDay)
  current.setDate(current.getDate() - startDay)

  while (current <= lastDay || weeks.length < 5) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
    if (weeks.length >= 6) break
  }

  return weeks
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function PlannerTab() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'month'>('week')
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true)
      try {
        // Build a window: start of previous month → end of next month
        // (covers any week or month view the user navigates to)
        const start = new Date(currentDate)
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)

        const end = new Date(currentDate)
        end.setMonth(end.getMonth() + 2)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)

        const params = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })

        const res = await fetch(`/api/schedule?${params}`)
        const data = await res.json()
        if (data.success) setPosts(data.data || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [currentDate])

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'week') {
      d.setDate(d.getDate() + dir * 7)
    } else {
      d.setMonth(d.getMonth() + dir)
    }
    setCurrentDate(d)
  }

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const monthWeeks = useMemo(() => getMonthDates(currentDate), [currentDate])

  const filteredPosts = platformFilter
    ? posts.filter((p) => p.platforms.includes(platformFilter as Platform))
    : posts

  const getPostsForDay = (date: Date) =>
    filteredPosts.filter((p) => isSameDay(new Date(p.scheduledAt), date))

  const getPostsForHour = (date: Date, hour: number) =>
    getPostsForDay(date).filter((p) => new Date(p.scheduledAt).getHours() === hour)

  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] min-w-[180px] text-center">
            {formatMonth(currentDate)}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <Tabs
          items={[
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
          ]}
          active={view}
          onChange={(id) => setView(id as 'week' | 'month')}
          variant="pill"
        />

        <Link href="/create">
          <Button leftIcon={<Plus size={14} />} size="sm">
            Schedule Video
          </Button>
        </Link>
      </div>

      {/* Platform filter strip */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPlatformFilter(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer',
            !platformFilter
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
          )}
        >
          All
        </button>
        {(['tiktok', 'instagram', 'youtube', 'x'] as const).map((p) => {
          const count = posts.filter((post) => post.platforms.includes(p)).length
          return (
            <button
              key={p}
              onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5',
                platformFilter === p
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[p] }}
              />
              <span className="capitalize">{p}</span>
              {count > 0 && (
                <span className="ml-0.5 text-[9px] opacity-60">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Calendar */}
      {loading ? (
        <Skeleton width="100%" height={500} rounded="lg" />
      ) : view === 'week' ? (
        /* WEEK VIEW */
        <div className="border border-[var(--border)] rounded-10 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {weekDates.map((date, i) => (
              <div
                key={i}
                className="px-2 py-2 text-center border-r border-[var(--border)] last:border-r-0"
              >
                <p className="text-[10px] text-[var(--text-dim)] uppercase">
                  {DAYS[i]}
                </p>
                <p
                  className={cn(
                    'text-[14px] font-medium mt-0.5',
                    isSameDay(date, today)
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-primary)]'
                  )}
                >
                  {date.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-7 min-h-[40px] border-b border-[var(--border)] last:border-b-0"
              >
                {weekDates.map((date, di) => {
                  const hourPosts = getPostsForHour(date, hour)
                  return (
                    <div
                      key={di}
                      className={cn(
                        'relative border-r border-[var(--border)] last:border-r-0 p-0.5',
                        hour % 2 === 0 ? 'bg-transparent' : 'bg-[var(--surface-hover)]/30',
                        'group'
                      )}
                    >
                      {di === 0 && (
                        <span className="absolute -left-0 top-0.5 text-[8px] text-[var(--text-dim)] pl-0.5">
                          {hour}:00
                        </span>
                      )}
                      {hourPosts.map((post) => (
                        <div
                          key={post.id}
                          className="rounded-[5px] px-1.5 py-0.5 mb-0.5 cursor-pointer"
                          style={{
                            backgroundColor: `${PLATFORM_COLORS[post.platforms[0]] || 'var(--accent)'}20`,
                            borderLeft: `3px solid ${PLATFORM_COLORS[post.platforms[0]] || 'var(--accent)'}`,
                          }}
                        >
                          <p className="text-[9px] font-medium text-[var(--text-primary)] truncate">
                            {post.title}
                          </p>
                        </div>
                      ))}
                      <Link
                        href={`/create?scheduledAt=${new Date(date.setHours(hour, 0, 0, 0)).toISOString()}`}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)]/60"
                      >
                        <Plus size={16} className="text-[var(--text-primary)]" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* MONTH VIEW */
        <div className="border border-[var(--border)] rounded-10 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center border-r border-[var(--border)] last:border-r-0"
              >
                <p className="text-[10px] text-[var(--text-dim)] uppercase font-medium">
                  {day}
                </p>
              </div>
            ))}
          </div>

          {/* Week rows */}
          {monthWeeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7 border-b border-[var(--border)] last:border-b-0"
            >
              {week.map((date, di) => {
                const dayPosts = getPostsForDay(date)
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = isSameDay(date, today)

                return (
                  <div
                    key={di}
                    className={cn(
                      'min-h-[120px] p-1.5 border-r border-[var(--border)] last:border-r-0 relative group',
                      !isCurrentMonth && 'opacity-40'
                    )}
                  >
                    <div className="flex justify-end mb-1">
                      <span
                        className={cn(
                          'text-[13px] w-6 h-6 flex items-center justify-center rounded-full',
                          isToday
                            ? 'bg-[var(--accent)] text-white font-bold'
                            : 'text-[var(--text-primary)]'
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="rounded-[4px] px-1.5 py-0.5 mb-0.5 cursor-pointer"
                        style={{
                          backgroundColor: `${PLATFORM_COLORS[post.platforms[0]] || 'var(--accent)'}20`,
                          borderLeft: `2px solid ${PLATFORM_COLORS[post.platforms[0]] || 'var(--accent)'}`,
                        }}
                      >
                        <p className="text-[9px] font-medium text-[var(--text-primary)] truncate">
                          {post.title}
                        </p>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[9px] text-[var(--accent)] cursor-pointer">
                        +{dayPosts.length - 3} more
                      </p>
                    )}
                    <Link
                      href={`/create?scheduledAt=${new Date(date.setHours(9, 0, 0, 0)).toISOString()}`}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40"
                    >
                      <Plus size={24} className="text-[var(--text-primary)]" />
                    </Link>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
