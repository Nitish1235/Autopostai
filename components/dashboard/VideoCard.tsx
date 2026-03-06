'use client'

import Image from 'next/image'
import { Play, MoreVertical, Eye, Heart, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Video, Platform, VideoStatus } from '@/types'

interface VideoCardProps {
  video: Partial<Video> & { id: string; title: string; status: VideoStatus }
  view?: 'grid' | 'list'
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const STATUS_BADGE: Record<string, { variant: 'success' | 'accent' | 'danger' | 'dim' | 'warning'; label: string }> = {
  posted: { variant: 'success', label: 'Posted' },
  scheduled: { variant: 'accent', label: 'Scheduled' },
  failed: { variant: 'danger', label: 'Failed' },
  ready: { variant: 'dim', label: 'Ready' },
  rendering: { variant: 'warning', label: 'Rendering' },
  generating_script: { variant: 'warning', label: 'Scripting' },
  generating_images: { variant: 'warning', label: 'Images' },
  generating_voice: { variant: 'warning', label: 'Voice' },
  pending: { variant: 'dim', label: 'Pending' },
}

const STYLE_GRADIENTS: Record<string, string> = {
  cinematic: 'linear-gradient(160deg, #0D2137, #1A4D6E, #C8762A)',
  anime: 'linear-gradient(160deg, #FFB3D9, #B3D9FF, #FFD9B3)',
  dark_fantasy: 'linear-gradient(160deg, #0D0013, #200033, #400060)',
  cyberpunk: 'linear-gradient(160deg, #000D1A, #001F3F, #CC00FF)',
  documentary: 'linear-gradient(160deg, #2C2416, #4A3E2E, #766655)',
  vintage: 'linear-gradient(160deg, #3D2B1F, #7A5C3A, #D4A86A)',
  '3d_render': 'linear-gradient(160deg, #1A1A2E, #16213E, #0F3460)',
  minimal: 'linear-gradient(160deg, #E8E8E8, #F5F5F5, #FFFFFF)',
}

function timeAgo(date: Date | string | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

function formatViews(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function PlatformDots({ platforms, publishedPlatforms }: { platforms?: Platform[]; publishedPlatforms?: string[] }) {
  if (!platforms?.length) return null
  const posted = new Set(publishedPlatforms ?? [])
  return (
    <div className="flex gap-1">
      {platforms.map((p) => (
        <div
          key={p}
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: posted.has(p) ? PLATFORM_COLORS[p] : 'transparent',
            border: `1.5px solid ${posted.has(p) ? PLATFORM_COLORS[p] : 'rgba(255,255,255,0.25)'}`,
            opacity: posted.has(p) ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  )
}

function VideoCard({ video, view = 'grid', onClick, onEdit, onDelete }: VideoCardProps) {
  const statusInfo = STATUS_BADGE[video.status] || STATUS_BADGE.pending
  const gradient = STYLE_GRADIENTS[video.imageStyle || 'cinematic']
  const views = video.analytics?.totalViews
  const likes = video.analytics?.totalLikes

  if (view === 'list') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 py-3 px-3 border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer rounded-[8px]"
      >
        {/* Thumbnail */}
        <div
          className="w-12 h-12 rounded-[8px] overflow-hidden shrink-0 relative"
          style={{ background: gradient }}
        >
          {video.thumbnailUrl && (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="48px" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
            {video.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformDots platforms={video.platforms} publishedPlatforms={video.publishedPlatforms} />
            <span className="text-[11px] text-[var(--text-dim)]">
              {timeAgo(video.createdAt)}
            </span>
            <Badge variant={statusInfo.variant} size="sm">
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)] shrink-0">
          {views !== undefined && (
            <span className="flex items-center gap-1">
              <Eye size={12} /> {formatViews(views)}
            </span>
          )}
          {likes !== undefined && (
            <span className="flex items-center gap-1">
              <Heart size={12} /> {formatViews(likes)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            align="right"
            trigger={
              <button className="p-1.5 rounded-md text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
                <MoreVertical size={14} />
              </button>
            }
            items={[
              { label: 'Edit', onClick: onEdit },
              { label: 'Delete', variant: 'danger', onClick: onDelete },
            ]}
          />
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className="border border-[var(--border)] rounded-10 overflow-hidden cursor-pointer transition-all hover:border-[var(--border-hover)] hover:shadow-lg group"
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: '9/16', background: gradient }}>
        {video.thumbnailUrl && (
          <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="300px" />
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </div>

        {/* Platform icons */}
        <div className="absolute bottom-2 right-2">
          <PlatformDots platforms={video.platforms} publishedPlatforms={video.publishedPlatforms} />
        </div>

        {/* View count overlay */}
        {views !== undefined && views > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-2">
            <span className="flex items-center gap-1 text-white text-[11px]">
              <Play size={10} fill="white" /> {formatViews(views)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-[12px] font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
          {video.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-[var(--text-dim)]">
            {video.platforms?.join(' · ')}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">
            {timeAgo(video.createdAt)}
          </span>
        </div>
        {(views !== undefined || likes !== undefined) && (
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-dim)]">
            {views !== undefined && <span>{formatViews(views)} views</span>}
            {likes !== undefined && <span>{formatViews(likes)} likes</span>}
            {video.analytics?.watchRate !== undefined && (
              <span>{video.analytics.watchRate}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { VideoCard }
export type { VideoCardProps }
