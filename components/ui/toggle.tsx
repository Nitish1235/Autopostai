'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

type ToggleSize = 'sm' | 'md'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: ToggleSize
}

const dimensions: Record<ToggleSize, { track: string; thumb: number; offset: number }> = {
  sm: { track: 'w-[28px] h-[16px]', thumb: 12, offset: 12 },
  md: { track: 'w-[32px] h-[18px]', thumb: 14, offset: 14 },
}

function Toggle({ checked, onChange, disabled = false, size = 'md' }: ToggleProps) {
  const dim = dimensions[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        dim.track,
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.span
        className="block rounded-full bg-white shadow-sm"
        style={{ width: dim.thumb, height: dim.thumb }}
        animate={{ x: checked ? dim.offset : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

export { Toggle }
export type { ToggleProps }
