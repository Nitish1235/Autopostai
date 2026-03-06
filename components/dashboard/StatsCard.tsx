'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

interface StatsCardProps {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  icon?: React.ReactNode
  loading?: boolean
}

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }

    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, duration])

  return count
}

function parseNumericValue(value: string): { num: number; suffix: string } {
  const match = value.match(/^([\d,.]+)\s*(.*)$/)
  if (!match) return { num: 0, suffix: value }
  const num = parseFloat(match[1].replace(/,/g, ''))
  return { num: isNaN(num) ? 0 : num, suffix: match[2] }
}

function formatWithSuffix(num: number, original: string): string {
  const { suffix } = parseNumericValue(original)
  if (original.includes('K')) return `${(num / 1000).toFixed(1)}K`
  if (original.includes('M')) return `${(num / 1000000).toFixed(1)}M`
  if (original.includes('%')) return `${num}%`
  if (num >= 1000) return num.toLocaleString()
  return String(num) + (suffix ? ` ${suffix}` : '')
}

function StatsCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  loading = false,
}: StatsCardProps) {
  const { num } = parseNumericValue(value)
  const animatedNum = useCountUp(num)

  if (loading) {
    return (
      <Card padding="md">
        <Skeleton width={80} height={10} rounded="sm" />
        <Skeleton width={100} height={26} rounded="sm" className="mt-2" />
        <Skeleton width={60} height={10} rounded="sm" className="mt-1" />
      </Card>
    )
  }

  return (
    <Card padding="md" className="relative">
      {icon && (
        <div className="absolute top-4 right-4 text-[var(--text-dim)]">
          {icon}
        </div>
      )}
      <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[var(--text-dim)]">
        {label}
      </p>
      <p className="text-[26px] font-bold text-[var(--text-primary)] tracking-[-0.5px] mt-2 leading-none">
        {formatWithSuffix(animatedNum, value)}
      </p>
      {delta && (
        <div className="flex items-center gap-1 mt-1">
          {deltaPositive !== undefined && (
            deltaPositive ? (
              <ArrowUp size={10} className="text-[var(--success)]" />
            ) : (
              <ArrowDown size={10} className="text-[var(--danger)]" />
            )
          )}
          <span
            className={cn(
              'text-[11px]',
              deltaPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            {delta}
          </span>
        </div>
      )}
    </Card>
  )
}

export { StatsCard }
export type { StatsCardProps }
