import { cn } from '@/lib/utils/cn'

type PhonePlatform = 'tiktok' | 'instagram' | 'youtube' | 'generic'

interface PhoneMockupProps {
  children: React.ReactNode
  className?: string
  platform?: PhonePlatform
}

function PhoneMockup({
  children,
  className,
  platform = 'generic',
}: PhoneMockupProps) {
  return (
    <div
      className={cn(
        'relative w-[300px] rounded-[38px] border-[8px] border-[#1C1C1E] overflow-hidden shadow-float',
        className
      )}
      style={{ aspectRatio: '9/16' }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-[22px] bg-[#1C1C1E] rounded-b-[14px] z-20" />

      {/* Content */}
      <div className="w-full h-full overflow-hidden relative">{children}</div>

      {/* Platform chrome overlay */}
      {platform !== 'generic' && (
        <div className="absolute bottom-0 left-0 right-0 h-[40px] z-10 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center gap-6 pb-2">
          {platform === 'tiktok' && (
            <>
              <NavDot />
              <NavDot />
              <NavDot active />
              <NavDot />
              <NavDot />
            </>
          )}
          {platform === 'instagram' && (
            <>
              <NavDot />
              <NavDot />
              <NavDot active />
              <NavDot />
              <NavDot />
            </>
          )}
          {platform === 'youtube' && (
            <>
              <NavDot />
              <NavDot active />
              <NavDot />
              <NavDot />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NavDot({ active = false }: { active?: boolean }) {
  return (
    <div
      className={cn(
        'w-[6px] h-[6px] rounded-full',
        active ? 'bg-white' : 'bg-white/30'
      )}
    />
  )
}

export { PhoneMockup }
export type { PhoneMockupProps }
