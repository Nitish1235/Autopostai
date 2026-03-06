'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

type ProgressSize = 'sm' | 'md' | 'lg'
type ProgressColor = 'accent' | 'success' | 'warning' | 'danger'

interface ProgressProps {
  value: number
  size?: ProgressSize
  color?: ProgressColor
  showLabel?: boolean
  animated?: boolean
  className?: string
}

const sizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
}

const colorClasses: Record<ProgressColor, string> = {
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
}

function Progress({
  value,
  size = 'md',
  color = 'accent',
  showLabel = false,
  animated = true,
  className,
}: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-[var(--text-secondary)]">Progress</span>
          <span className="text-[var(--text-primary)] font-medium">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-[var(--border)] overflow-hidden',
          sizeClasses[size]
        )}
      >
        {animated ? (
          <motion.div
            className={cn('h-full rounded-full', colorClasses[color])}
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        ) : (
          <div
            className={cn('h-full rounded-full', colorClasses[color])}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  )
}

export { Progress }
export type { ProgressProps }
