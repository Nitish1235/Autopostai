'use client'

import { Eye, Heart, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Platform } from '@/types'

interface TopVideo {
  id: string
  title: string
  platforms: string[]
  views: number
  likes: number
  watchRate: number
  postedAt: string | null
  thumbnailUrl: string | null
}

interface TopVideosTableProps {
  videos: TopVideo[]
  loading?: boolean
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TT',
  instagram: 'IG',
  youtube: 'YT',
  x: 'X',
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function TopVideosTable({ videos, loading }: TopVideosTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="100%" height={48} rounded="md" />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-[13px] text-[var(--text-dim)]">
        No videos in this period
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2 pl-1">
              #
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2">
              Video
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2">
              Platforms
            </th>
            <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2">
              <span className="inline-flex items-center gap-1">
                <Eye size={10} /> Views
              </span>
            </th>
            <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2">
              <span className="inline-flex items-center gap-1">
                <Heart size={10} /> Likes
              </span>
            </th>
            <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2">
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> Watch
              </span>
            </th>
            <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] pb-2 pr-1">
              Posted
            </th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video, index) => (
            <tr
              key={video.id}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] transition-colors"
            >
              {/* Rank */}
              <td className="py-2.5 pl-1">
                <span className="text-[12px] font-bold text-[var(--text-dim)] tabular-nums">
                  {index + 1}
                </span>
              </td>

              {/* Title */}
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2.5">
                  {/* Thumbnail */}
                  {video.thumbnailUrl ? (
                    <div className="w-8 h-12 rounded-[4px] overflow-hidden bg-[var(--surface-hover)] shrink-0">
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-12 rounded-[4px] bg-[var(--surface-hover)] shrink-0" />
                  )}
                  <span className="text-[13px] text-[var(--text-primary)] font-medium truncate max-w-[200px]">
                    {video.title}
                  </span>
                </div>
              </td>

              {/* Platforms */}
              <td className="py-2.5">
                <div className="flex gap-1">
                  {video.platforms.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold text-white"
                      style={{
                        backgroundColor:
                          PLATFORM_COLORS[p as Platform] ?? 'var(--text-dim)',
                      }}
                    >
                      {PLATFORM_LABELS[p] || p[0].toUpperCase()}
                    </span>
                  ))}
                </div>
              </td>

              {/* Views */}
              <td className="py-2.5 text-right">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatNumber(video.views)}
                </span>
              </td>

              {/* Likes */}
              <td className="py-2.5 text-right">
                <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">
                  {formatNumber(video.likes)}
                </span>
              </td>

              {/* Watch Rate */}
              <td className="py-2.5 text-right">
                <Badge
                  variant={
                    video.watchRate >= 70
                      ? 'success'
                      : video.watchRate >= 40
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                >
                  {video.watchRate}%
                </Badge>
              </td>

              {/* Posted date */}
              <td className="py-2.5 text-right pr-1">
                <span className="text-[12px] text-[var(--text-dim)]">
                  {formatDate(video.postedAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { TopVideosTable }
