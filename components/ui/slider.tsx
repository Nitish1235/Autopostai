'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  showValue?: boolean
  formatValue?: (v: number) => string
  className?: string
}

function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  showValue = true,
  formatValue,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const percent = ((value - min) / (max - min)) * 100
  const display = formatValue ? formatValue(value) : String(value)

  const calculateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const raw = min + ratio * (max - min)
      const stepped = Math.round(raw / step) * step
      return Math.max(min, Math.min(max, Number(stepped.toFixed(10))))
    },
    [min, max, step, value]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(true)
      onChange(calculateValue(e.clientX))
    },
    [calculateValue, onChange]
  )

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      onChange(calculateValue(e.clientX))
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, calculateValue, onChange])

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-[12px] mb-2">
          {label && (
            <span className="text-[var(--text-secondary)]">{label}</span>
          )}
          {showValue && (
            <span className="text-[var(--accent)] font-medium">{display}</span>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className="relative h-1.5 rounded-full bg-[var(--border)] cursor-pointer select-none"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${percent}%` }}
        />
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md',
            'transition-transform duration-100',
            dragging ? 'scale-110' : 'hover:scale-125'
          )}
          style={{ left: `calc(${percent}% - 8px)` }}
        />
      </div>
    </div>
  )
}

export { Slider }
export type { SliderProps }
