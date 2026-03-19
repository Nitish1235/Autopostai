'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { VideoCard } from '@/components/dashboard/VideoCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { EmptyState } from '@/components/ui/empty-state'
import { useUser } from '@/hooks/useUser'
import type { Video, VideoStatus } from '@/types'

interface AnalyticsData {
  totals: {
    totalViews: number
    totalFollowers: number
    totalVideos: number
    avgWatchRate: number
  }
  deltas: {
    viewsDelta: number
    followersDelta: number
    videosDelta: number
    watchRateDelta: number
  }
  platformBreakdown: { platform: string; views: number }[]
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [recentVideos, setRecentVideos] = useState<Partial<Video>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, videosRes] = await Promise.all([
          fetch('/api/analytics?period=7d'),
          fetch('/api/video?limit=4&sort=createdAt&order=desc'),
        ])

        if (analyticsRes.ok) {
          const aData = await analyticsRes.json()
          if (aData.success) setAnalytics(aData.data)
        }

        if (videosRes.ok) {
          const vData = await videosRes.json()
          if (vData.success && vData.data?.videos) setRecentVideos(vData.data.videos)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const autopilotEnabled = user?.autopilotConfig?.enabled ?? false
  const userName = user?.name?.split(' ')[0] || 'Creator'
  const videosThisWeek = analytics?.deltas?.videosDelta ?? 0

  return (
    <div className="px-8 py-7 max-w-[1200px]">
      {/* Section 1 — Greeting */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-[-0.5px]">
            {getGreeting()}, {userLoading ? '...' : userName}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Your channel posted {videosThisWeek} videos this week
            {autopilotEnabled && (
              <span className="inline-flex items-center gap-1 ml-2">
                · <Zap size={12} className="text-[var(--accent)]" /> Autopilot is running
              </span>
            )}
          </p>
        </div>
        <Link href="/create">
          <Button leftIcon={<Plus size={16} />}>Create</Button>
        </Link>
      </div>

      {/* Section 2 — Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          label="Videos Posted"
          value={loading ? '0' : String(analytics?.totals?.totalVideos ?? 0)}
          delta={analytics?.deltas?.videosDelta !== undefined ? `+${analytics.deltas.videosDelta}` : undefined}
          deltaPositive={true}
          loading={loading}
        />
      </div>
      {/* Section 3 — Two columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {/* Recent Videos */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Recent Videos
              </h2>
              <Link
                href="/videos"
                className="text-[12px] text-[var(--accent)] hover:underline"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <Skeleton width={48} height={48} rounded="md" />
                    <div className="flex-1">
                      <Skeleton width="70%" height={14} rounded="sm" />
                      <Skeleton width={100} height={10} rounded="sm" className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentVideos.length > 0 ? (
              recentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video as Partial<Video> & { id: string; title: string; status: VideoStatus }}
                  view="list"
                />
              ))
            ) : (
              <EmptyState
                icon={<Plus size={20} />}
                title="No videos yet"
                description="Create your first AI video to get started."
                action={{ label: 'Create Video', onClick: () => window.location.href = '/create' }}
              />
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Platform Performance (Hidden as per request) */}
          {/* 
          <Card padding="md">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Platform Performance
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={24} rounded="sm" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(analytics?.platformBreakdown || []).map((pb) => {
                  const maxViews = Math.max(
                    ...(analytics?.platformBreakdown?.map((p) => p.views) || [1])
                  )
                  const percent = maxViews > 0 ? (pb.views / maxViews) * 100 : 0
                  const colors: Record<string, string> = {
                    tiktok: '#00F2EA',
                    instagram: '#E1306C',
                    youtube: '#FF0000',
                    x: 'rgba(255,255,255,0.6)',
                  }
                  return (
                    <div key={pb.platform}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors[pb.platform] || 'var(--accent)' }}
                          />
                          <span className="text-[12px] text-[var(--text-secondary)] capitalize">
                            {pb.platform}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-primary)] font-medium">
                          {formatNumber(pb.views)}
                        </span>
                      </div>
                      <Progress value={percent} size="sm" animated />
                    </div>
                  )
                })}
                {(!analytics?.platformBreakdown || analytics.platformBreakdown.length === 0) && (
                  <p className="text-[12px] text-[var(--text-dim)] text-center py-4">
                    No platform data yet
                  </p>
                )}
              </div>
            )}
          </Card>
          */}

          {/* Autopilot Status */}
          <Card padding="md">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
              Autopilot Status
            </h2>
            {autopilotEnabled ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)] pulse-dot" />
                  <span className="text-[12px] font-medium text-[var(--success)]">
                    Running
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Autopilot is actively generating and posting videos on your schedule.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-dim)]" />
                  <span className="text-[12px] text-[var(--text-dim)]">
                    Paused
                  </span>
                </div>
                <Link
                  href="/autopilot"
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Enable Autopilot →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Section 4 — Activity feed */}
      <Card padding="md">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
          Activity
        </h2>
        <ActivityFeed userId={user?.id || ''} limit={8} />
      </Card>
    </div>
  )
}
