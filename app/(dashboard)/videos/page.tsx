'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Grid3X3, List, Film, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dropdown } from '@/components/ui/dropdown'
import { Drawer } from '@/components/ui/drawer'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { VideoCard } from '@/components/dashboard/VideoCard'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Video, VideoStatus, Platform, PlatformStatus } from '@/types'

const ALL_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'x']
const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X (Twitter)',
}

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'posted', label: 'Posted' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'ready', label: 'Draft' },
  { id: 'failed', label: 'Failed' },
]

export default function VideosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Partial<Video>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedVideo, setSelectedVideo] = useState<Partial<Video> | null>(null)
  const [drawerTab, setDrawerTab] = useState('details')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String((page - 1) * limit),
        sort: 'createdAt',
        order: 'desc',
      })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/video?${params}`)
      const data = await res.json()
      if (data.success) {
        setVideos(data.data?.videos || [])
        setTotal(data.data?.total || 0)
      }
    } catch {
      toast({ message: 'Failed to load videos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleDelete = async (videoId: string) => {
    try {
      const res = await fetch(`/api/video/${videoId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast({ message: 'Video deleted', type: 'success' })
        fetchVideos()
        setSelectedVideo(null)
      } else {
        toast({ message: data.error || 'Failed to delete', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="px-8 py-7 max-w-[1200px]">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-[240px]">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search videos..."
            leftIcon={<Search size={14} />}
          />
        </div>

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setStatusFilter(f.id)
                setPage(1)
              }}
              className={cn(
                'px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all cursor-pointer',
                statusFilter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors cursor-pointer',
              viewMode === 'grid'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
            )}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors cursor-pointer',
              viewMode === 'list'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
            )}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Video grid/list */}
      {loading ? (
        <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-1')}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              width="100%"
              height={viewMode === 'grid' ? 300 : 64}
              rounded="lg"
            />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<Film size={20} />}
          title="No videos yet"
          description="Create your first AI video to see it here."
          action={{ label: 'Create Video', onClick: () => router.push('/create') }}
        />
      ) : (
        <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-0')}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video as Partial<Video> & { id: string; title: string; status: VideoStatus }}
              view={viewMode}
              onClick={() => setSelectedVideo(video)}
              onDelete={() => handleDelete(video.id!)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            ← Prev
          </Button>
          <span className="text-[12px] text-[var(--text-dim)]">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} videos
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Video detail drawer */}
      <Drawer
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title={selectedVideo?.title || 'Video Details'}
        width={400}
      >
        {selectedVideo && (
          <div>
            <Tabs
              items={[
                { id: 'details', label: 'Details' },
                { id: 'publish', label: 'Publish' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'captions', label: 'Captions' },
              ]}
              active={drawerTab}
              onChange={setDrawerTab}
            />
            <div className="mt-4">
              {drawerTab === 'details' && (
                <div className="space-y-4">
                  {selectedVideo.videoUrl ? (
                    <div className="rounded-[8px] overflow-hidden bg-[var(--bg-card)] border border-[var(--border)]">
                      <video
                        src={selectedVideo.videoUrl}
                        controls
                        className="w-full aspect-[9/16] max-h-[400px] object-contain bg-black"
                        poster={selectedVideo.thumbnailUrl || undefined}
                      />
                      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)] flex justify-end">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = selectedVideo.videoUrl!
                            a.download = `${selectedVideo.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video'}.mp4`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }}
                        >
                          ↓ Download Video
                        </Button>
                      </div>
                    </div>
                  ) : selectedVideo.thumbnailUrl ? (
                    <div className="aspect-video rounded-[8px] overflow-hidden bg-[var(--bg-card)]">
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt={selectedVideo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider">
                      Topic
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] mt-1">
                      {selectedVideo.topic || 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedVideo.imageStyle && (
                      <Badge variant="dim" size="sm">
                        {selectedVideo.imageStyle}
                      </Badge>
                    )}
                    {selectedVideo.voiceId && (
                      <Badge variant="dim" size="sm">
                        {selectedVideo.voiceId}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)]">
                    Created {selectedVideo.createdAt
                      ? new Date(selectedVideo.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              )}
              {drawerTab === 'analytics' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Views', value: selectedVideo.analytics?.totalViews ?? 0 },
                      { label: 'Likes', value: selectedVideo.analytics?.totalLikes ?? 0 },
                      { label: 'Watch %', value: `${selectedVideo.analytics?.watchRate ?? 0}%` },
                      { label: 'Shares', value: 0 },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)]">
                        <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                          {stat.label}
                        </p>
                        <p className="text-[18px] font-bold text-[var(--text-primary)] mt-1">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {drawerTab === 'publish' && (
                <PublishTab
                  video={selectedVideo}
                  onPublish={async (platform) => {
                    try {
                      const res = await fetch(`/api/publish/${selectedVideo.id}/platform`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ platform }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        toast({ message: `Queued for ${PLATFORM_LABELS[platform]}`, type: 'success' })
                        // Refresh to get updated statuses
                        fetchVideos()
                      } else {
                        toast({ message: data.error || 'Failed to publish', type: 'error' })
                      }
                    } catch {
                      toast({ message: 'Network error', type: 'error' })
                    }
                  }}
                />
              )}
              {drawerTab === 'captions' && (
                <div className="space-y-3">
                  <Textarea
                    label="Caption"
                    placeholder="Add a caption for this video..."
                    minHeight={100}
                  />
                  <Button size="sm">Save Captions</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ── Publish Tab Component ─────────────────────────────

function PublishTab({
  video,
  onPublish,
}: {
  video: Partial<Video>
  onPublish: (platform: Platform) => Promise<void>
}) {
  const [publishing, setPublishing] = useState<string | null>(null)
  const statuses = (video.platformStatuses ?? {}) as Record<string, PlatformStatus>
  const published = new Set(video.publishedPlatforms ?? [])
  const canPublish = (video.status === 'ready' || video.status === 'posted' || video.status === 'failed') && !!video.videoUrl

  const handlePublish = async (platform: Platform) => {
    setPublishing(platform)
    try {
      await onPublish(platform)
    } finally {
      setPublishing(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider mb-3">
        Platform Distribution
      </p>

      {ALL_PLATFORMS.map((platform) => {
        const status = statuses[platform] as PlatformStatus | undefined
        const isPosted = published.has(platform)
        const isPending = status === 'pending' || publishing === platform
        const isFailed = status === 'failed' && !isPosted

        return (
          <div
            key={platform}
            className="flex items-center justify-between p-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)]"
          >
            {/* Platform name with color dot */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[platform] }}
              />
              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                {PLATFORM_LABELS[platform]}
              </span>
            </div>

            {/* Status / Action */}
            <div className="flex items-center gap-2">
              {isPosted ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Posted
                  </span>
                </>
              ) : isPending ? (
                <>
                  <Loader2 size={14} className="text-[var(--accent)] animate-spin" />
                  <span className="text-[11px] text-[var(--accent)]">
                    Publishing...
                  </span>
                </>
              ) : isFailed ? (
                <>
                  <AlertCircle size={14} className="text-red-400" />
                  <button
                    onClick={() => handlePublish(platform)}
                    disabled={!canPublish}
                    className="text-[11px] text-red-400 font-medium hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Failed — Retry
                  </button>
                </>
              ) : canPublish ? (
                <button
                  onClick={() => handlePublish(platform)}
                  className="text-[11px] text-[var(--accent)] font-medium hover:text-[var(--accent-hover)] transition-colors cursor-pointer flex items-center gap-1"
                >
                  Post now <ExternalLink size={10} />
                </button>
              ) : (
                <span className="text-[11px] text-[var(--text-dim)]">
                  —
                </span>
              )}
            </div>
          </div>
        )
      })}

      {!canPublish && (
        <p className="text-[11px] text-[var(--text-dim)] text-center mt-2">
          Video must be in &ldquo;Ready&rdquo; or &ldquo;Posted&rdquo; status to publish.
        </p>
      )}
    </div>
  )
}
