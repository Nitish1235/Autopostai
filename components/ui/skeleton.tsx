import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedClasses = {
  sm: 'rounded-[4px]',
  md: 'rounded-[8px]',
  lg: 'rounded-[12px]',
  full: 'rounded-full',
}

function Skeleton({
  width,
  height,
  className,
  rounded = 'md',
}: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', roundedClasses[rounded], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

export { Skeleton }
export type { SkeletonProps }
