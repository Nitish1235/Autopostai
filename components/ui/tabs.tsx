'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
}

function Tabs({ items, active, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className="inline-flex bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-10">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative px-3 py-1.5 text-[12px] rounded-[7px] font-medium transition-colors cursor-pointer',
              'flex items-center gap-1.5',
              active === item.id
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {active === item.id && (
              <motion.div
                layoutId="pill-bg"
                className="absolute inset-0 bg-[var(--bg-secondary)] rounded-[7px] shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-[1] flex items-center gap-1.5">
              {item.icon}
              {item.label}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex border-b border-[var(--border)]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'relative px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer',
            'flex items-center gap-1.5',
            active === item.id
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {item.icon}
          {item.label}
          {active === item.id && (
            <motion.div
              layoutId="underline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

export { Tabs }
export type { TabsProps, TabItem }
