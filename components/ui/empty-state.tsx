import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center py-16 px-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mt-4">
        {title}
      </h3>
      <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-[280px]">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
