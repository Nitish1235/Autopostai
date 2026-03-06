'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Platform } from '@/types'

interface PlatformData {
  platform: string
  views: number
  percentage: number
}

interface PlatformDonutProps {
  data: PlatformData[]
  loading?: boolean
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: PlatformData
  }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]

  return (
    <div className="px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] shadow-lg">
      <p className="text-[12px] font-medium text-[var(--text-primary)]">
        {PLATFORM_LABELS[item.payload.platform] || item.payload.platform}
      </p>
      <p className="text-[13px] font-bold text-[var(--text-primary)]">
        {formatViews(item.value)} views
      </p>
      <p className="text-[11px] text-[var(--text-secondary)]">
        {item.payload.percentage}% of total
      </p>
    </div>
  )
}

function PlatformDonut({ data, loading }: PlatformDonutProps) {
  const totalViews = useMemo(
    () => data.reduce((sum, d) => sum + d.views, 0),
    [data]
  )

  if (loading) {
    return <Skeleton width="100%" height={240} rounded="lg" />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-[13px] text-[var(--text-dim)]">
        No platform data
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6">
      {/* Donut chart */}
      <div className="w-[180px] h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="views"
              nameKey="platform"
              stroke="var(--bg-primary)"
              strokeWidth={2}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.platform}
                  fill={
                    PLATFORM_COLORS[entry.platform as Platform] ?? 'var(--accent)'
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[18px] font-bold text-[var(--text-primary)]">
            {formatViews(totalViews)}
          </span>
          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((entry) => (
          <div key={entry.platform} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor:
                  PLATFORM_COLORS[entry.platform as Platform] ?? 'var(--accent)',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-primary)] font-medium">
                  {PLATFORM_LABELS[entry.platform] || entry.platform}
                </span>
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {entry.percentage}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-hover)] mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${entry.percentage}%`,
                    backgroundColor:
                      PLATFORM_COLORS[entry.platform as Platform] ??
                      'var(--accent)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { PlatformDonut }
