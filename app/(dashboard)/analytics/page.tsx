'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye,
  Heart,
  Share2,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { Dropdown } from '@/components/ui/dropdown'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { ViewsChart } from '@/components/analytics/ViewsChart'
import { PlatformDonut } from '@/components/analytics/PlatformDonut'
import { TopVideosTable } from '@/components/analytics/TopVideosTable'
import { cn } from '@/lib/utils/cn'

type Period = '7d' | '30d' | '90d'
type PlatformFilter = 'all' | 'tiktok' | 'instagram' | 'youtube' | 'x'

interface DeltaInfo {
  value: number
  delta: number
  isPositive: boolean
}

interface AnalyticsData {
  summary: {
    totalViews: number
    totalLikes: number
    totalShares: number
    avgWatchRate: number
    videosPosted: number
    totalFollowers: number
  }
  deltas: {
    views: DeltaInfo
    likes: DeltaInfo
    watchRate: DeltaInfo
    followers: DeltaInfo
  }
  viewsOverTime: Array<{ date: string; views: number }>
  platformBreakdown: Array<{
    platform: string
    views: number
    percentage: number
  }>
  topVideos: Array<{
    id: string
    title: string
    platforms: string[]
    views: number
    likes: number
    watchRate: number
    postedAt: string | null
    thumbnailUrl: string | null
  }>
  bestTopics: Array<{
    niche: string
    avgViews: number
    videoCount: number
  }>
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const PERIOD_TABS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
]

const PLATFORM_FILTERS: { id: PlatformFilter; label: string }[] = [
  { id: 'all', label: 'All Platforms' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
]

function StatCard({
  label,
  value,
  delta,
  isPositive,
  icon,
  formatFn,
}: {
  label: string
  value: number
  delta: number
  isPositive: boolean
  icon: React.ReactNode
  formatFn?: (n: number) => string
}) {
  const display = formatFn ? formatFn(value) : formatNumber(value)

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider font-medium">
            {label}
          </p>
          <p className="text-[24px] font-bold text-[var(--text-primary)] mt-1 tabular-nums">
            {display}
          </p>
        </div>
        <div className="p-2 rounded-[8px] bg-[var(--accent-subtle)] text-[var(--accent)]">
          {icon}
        </div>
      </div>

      {delta !== 0 && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp size={12} className="text-[var(--success)]" />
          ) : (
            <TrendingDown size={12} className="text-[var(--danger)]" />
          )}
          <span
            className={cn(
              'text-[11px] font-semibold',
              isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            {isPositive ? '+' : ''}
            {delta}%
          </span>
          <span className="text-[11px] text-[var(--text-dim)]">vs prev</span>
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState<Period>('30d')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        period,
        platform: platformFilter,
      })
      const res = await fetch(`/api/analytics?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        toast({ message: json.error || 'Failed to load analytics', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [period, platformFilter, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="px-8 py-7 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
            Analytics
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Track your content performance across platforms
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Platform filter */}
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[12px] text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                {PLATFORM_FILTERS.find((f) => f.id === platformFilter)?.label}
              </button>
            }
            items={PLATFORM_FILTERS.map((f) => ({
              label: f.label,
              onClick: () => setPlatformFilter(f.id),
            }))}
          />

          {/* Period tabs */}
          <Tabs
            items={PERIOD_TABS}
            active={period}
            onChange={(id) => setPeriod(id as Period)}
            variant="pill"
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loading || !data ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={120} rounded="lg" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Views"
              value={data.summary.totalViews}
              delta={data.deltas.views.delta}
              isPositive={data.deltas.views.isPositive}
              icon={<Eye size={18} />}
            />
            <StatCard
              label="Total Likes"
              value={data.summary.totalLikes}
              delta={data.deltas.likes.delta}
              isPositive={data.deltas.likes.isPositive}
              icon={<Heart size={18} />}
            />
            <StatCard
              label="Avg Watch Rate"
              value={data.summary.avgWatchRate}
              delta={data.deltas.watchRate.delta}
              isPositive={data.deltas.watchRate.isPositive}
              icon={<Clock size={18} />}
              formatFn={(n) => `${n}%`}
            />
            <StatCard
              label="Followers"
              value={data.summary.totalFollowers}
              delta={data.deltas.followers.delta}
              isPositive={data.deltas.followers.isPositive}
              icon={<Users size={18} />}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Views over time */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Views Over Time
            </h2>
            {data && (
              <Badge variant="accent" size="sm">
                {data.summary.videosPosted} videos posted
              </Badge>
            )}
          </div>
          <ViewsChart
            data={data?.viewsOverTime ?? []}
            loading={loading}
          />
        </Card>

        {/* Platform breakdown */}
        <Card padding="md">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
            By Platform
          </h2>
          <PlatformDonut
            data={data?.platformBreakdown ?? []}
            loading={loading}
          />
        </Card>
      </div>

      {/* Top Videos + Best Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Videos */}
        <Card padding="md" className="lg:col-span-2">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
            Top Performing Videos
          </h2>
          <TopVideosTable
            videos={data?.topVideos ?? []}
            loading={loading}
          />
        </Card>

        {/* Best Topics */}
        <Card padding="md">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
            Best Topics
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={40} rounded="md" />
              ))}
            </div>
          ) : !data?.bestTopics.length ? (
            <p className="text-[13px] text-[var(--text-dim)] text-center py-6">
              No topic data yet
            </p>
          ) : (
            <div className="space-y-2">
              {data.bestTopics.map((topic, i) => (
                <div
                  key={topic.niche}
                  className="flex items-center gap-3 p-2.5 rounded-[8px] bg-[var(--surface-hover)]"
                >
                  <span className="text-[12px] font-bold text-[var(--text-dim)] w-5 text-center tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] capitalize truncate">
                      {topic.niche}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {topic.videoCount} videos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatNumber(topic.avgViews)}
                    </p>
                    <p className="text-[10px] text-[var(--text-dim)]">avg views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
