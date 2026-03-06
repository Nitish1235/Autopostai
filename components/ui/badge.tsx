import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'accent' | 'dim' | 'outline'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[9px] rounded-[4px]',
  md: 'px-2.5 py-1 text-[10px] rounded-[5px]',
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25',
  warning:
    'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/25',
  danger:
    'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/25',
  accent:
    'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)]',
  dim: 'bg-[var(--surface-hover)] text-[var(--text-dim)] border border-[var(--border)]',
  outline:
    'bg-transparent text-[var(--text-secondary)] border border-[var(--border)]',
}

const dotColorClasses: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  accent: 'bg-[var(--accent)]',
  dim: 'bg-[var(--text-dim)]',
  outline: 'bg-[var(--text-secondary)]',
}

function Badge({
  variant,
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-[0.5px] uppercase select-none',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-[5px] h-[5px] rounded-full pulse-dot',
            dotColorClasses[variant]
          )}
        />
      )}
      {children}
    </span>
  )
}

export { Badge }
export type { BadgeProps, BadgeVariant }
