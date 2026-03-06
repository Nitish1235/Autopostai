import { cn } from '@/lib/utils/cn'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  padding?: CardPadding
  hover?: boolean
  className?: string
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

function Card({
  padding = 'md',
  hover = false,
  className,
  children,
  header,
  footer,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-card)] border border-[var(--border)] rounded-10 transition-[border-color] duration-150',
        hover &&
          'hover:border-[var(--border-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
        className
      )}
    >
      {header && (
        <div
          className={cn(
            'border-b border-[var(--border)] pb-4 mb-5',
            padding !== 'none' && 'px-5 pt-5'
          )}
        >
          {header}
        </div>
      )}
      <div className={cn(header ? 'px-5 pb-5' : paddingClasses[padding])}>
        {children}
      </div>
      {footer && (
        <div
          className={cn(
            'border-t border-[var(--border)] pt-4 mt-5',
            padding !== 'none' && 'px-5 pb-5'
          )}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export { Card }
export type { CardProps }
