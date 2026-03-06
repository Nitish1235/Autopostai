'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface DataPoint {
  date: string
  views: number
}

interface ViewsChartProps {
  data: DataPoint[]
  loading?: boolean
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] shadow-lg">
      <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className="text-[14px] font-bold text-[var(--text-primary)]">
        {formatViews(payload[0].value)} views
      </p>
    </div>
  )
}

function ViewsChart({ data, loading }: ViewsChartProps) {
  const maxViews = useMemo(
    () => Math.max(...data.map((d) => d.views), 1),
    [data]
  )

  if (loading) {
    return <Skeleton width="100%" height={280} rounded="lg" />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-[13px] text-[var(--text-dim)]">
        No data available for this period
      </div>
    )
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={formatViews}
            tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
            tickLine={false}
            axisLine={false}
            domain={[0, maxViews * 1.1]}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="views"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#viewsGradient)"
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { ViewsChart }
