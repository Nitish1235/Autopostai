'use client'

import { useState, useEffect } from 'react'
import {
  PlusCircle,
  Send,
  Star,
  MinusCircle,
  XCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils/cn'

interface ActivityItem {
  id: string
  type: 'video_created' | 'video_posted' | 'milestone' | 'credit_used' | 'video_failed'
  text: string
  timestamp: string
}

interface ActivityFeedProps {
  userId: string
  limit?: number
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; iconColor: string }
> = {
  video_created: {
    icon: <PlusCircle size={14} />,
    bg: 'bg-[var(--accent-subtle)]',
    iconColor: 'text-[var(--accent)]',
  },
  video_posted: {
    icon: <Send size={14} />,
    bg: 'bg-[var(--success)]/15',
    iconColor: 'text-[var(--success)]',
  },
  milestone: {
    icon: <Star size={14} />,
    bg: 'bg-[var(--warning)]/15',
    iconColor: 'text-[var(--warning)]',
  },
  credit_used: {
    icon: <MinusCircle size={14} />,
    bg: 'bg-[var(--surface-hover)]',
    iconColor: 'text-[var(--text-dim)]',
  },
  video_failed: {
    icon: <XCircle size={14} />,
    bg: 'bg-[var(--danger)]/15',
    iconColor: 'text-[var(--danger)]',
  },
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ActivityFeed({ userId, limit = 8 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true)
        // Fetch recent videos as proxy for activity
        const res = await fetch(`/api/video?limit=${limit}&sort=createdAt&order=desc`)
        if (!res.ok) {
          setActivities([])
          return
        }
        const data = await res.json()
        if (data.success && data.data?.videos) {
          const items: ActivityItem[] = data.data.videos.map(
            (v: { id: string; title: string; status: string; createdAt: string }) => ({
              id: v.id,
              type:
                v.status === 'posted'
                  ? 'video_posted'
                  : v.status === 'failed'
                    ? 'video_failed'
                    : 'video_created',
              text:
                v.status === 'posted'
                  ? `"${v.title}" posted successfully`
                  : v.status === 'failed'
                    ? `"${v.title}" failed to generate`
                    : `Created "${v.title}"`,
              timestamp: v.createdAt,
            })
          )
          setActivities(items)
        }
      } catch {
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [userId, limit])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-3">
            <Skeleton width={32} height={32} rounded="full" />
            <div className="flex-1">
              <Skeleton width="80%" height={14} rounded="sm" />
              <Skeleton width={60} height={10} rounded="sm" className="mt-1" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<PlusCircle size={20} />}
        title="No activity yet"
        description="Your recent activity will appear here once you start creating videos."
      />
    )
  }

  return (
    <div>
      {activities.map((activity) => {
        const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.video_created
        return (
          <div
            key={activity.id}
            className="flex gap-3 py-3 border-b border-[var(--border)] last:border-0"
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                config.bg,
                config.iconColor
              )}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[var(--text-primary)] truncate">
                {activity.text}
              </p>
              <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                {timeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { ActivityFeed }
export type { ActivityFeedProps }
