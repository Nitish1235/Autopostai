import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: AvatarSize
  className?: string
}

const sizeConfig: Record<AvatarSize, { px: number; text: string }> = {
  xs: { px: 20, text: 'text-[8px]' },
  sm: { px: 28, text: 'text-[10px]' },
  md: { px: 36, text: 'text-[13px]' },
  lg: { px: 48, text: 'text-[16px]' },
  xl: { px: 80, text: 'text-[26px]' },
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const config = sizeConfig[size]

  if (src) {
    return (
      <div
        className={cn('relative rounded-full overflow-hidden shrink-0', className)}
        style={{ width: config.px, height: config.px }}
      >
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          className="object-cover"
          sizes={`${config.px}px`}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full shrink-0',
        'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold',
        config.text,
        className
      )}
      style={{ width: config.px, height: config.px }}
    >
      {getInitials(name)}
    </div>
  )
}

export { Avatar }
export type { AvatarProps }
