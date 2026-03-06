'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'default' | 'danger'
  divider?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, handleClose])

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className={cn(
              'absolute z-[50] top-[calc(100%+6px)] min-w-[160px]',
              'bg-[var(--bg-secondary)] border border-[var(--border)]',
              'rounded-10 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
              align === 'left' ? 'left-0' : 'right-0'
            )}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={`divider-${index}`}
                    className="border-t border-[var(--border)] my-1"
                  />
                )
              }

              const Comp = item.href ? 'a' : 'button'
              const extraProps = item.href
                ? { href: item.href }
                : { type: 'button' as const }

              return (
                <Comp
                  key={index}
                  {...extraProps}
                  className={cn(
                    'w-full px-3 py-2 rounded-[7px] text-[13px] text-left',
                    'flex items-center gap-2 transition-colors cursor-pointer',
                    item.variant === 'danger'
                      ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  )}
                  onClick={() => {
                    item.onClick?.()
                    handleClose()
                  }}
                >
                  {item.icon && (
                    <span className="w-4 h-4 shrink-0">{item.icon}</span>
                  )}
                  {item.label}
                </Comp>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Dropdown }
export type { DropdownProps, DropdownItem }
