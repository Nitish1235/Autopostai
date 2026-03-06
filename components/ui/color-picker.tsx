'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  label?: string
}

const PRESET_COLORS = [
  ['#FFFFFF', '#F5F5F7', '#FFE500', '#FF6B00', '#FF2D55', '#FF453A', '#FF9500', '#30B0C7'],
  ['#32D74B', '#0A84FF', '#5E5CE6', '#BF5AF2', '#1C1C1E', '#3A3A3C', '#636366', '#000000'],
]

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value.replace('#', ''))

  const handleHexChange = useCallback(
    (input: string) => {
      const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
      setHexInput(cleaned)
      if (cleaned.length === 6 && isValidHex(`#${cleaned}`)) {
        onChange(`#${cleaned.toUpperCase()}`)
      }
    },
    [onChange]
  )

  const handlePresetClick = useCallback(
    (color: string) => {
      onChange(color)
      setHexInput(color.replace('#', ''))
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          <div
            className="w-5 h-5 rounded-full border border-[var(--border)]"
            style={{ backgroundColor: value }}
          />
        </div>
      )}

      {/* Preset swatches */}
      <div className="flex flex-col gap-1.5">
        {PRESET_COLORS.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                className={cn(
                  'w-6 h-6 rounded-full cursor-pointer transition-all border',
                  value.toUpperCase() === color.toUpperCase()
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--bg-primary)] border-transparent'
                    : 'border-[var(--border)] hover:scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Custom hex */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[12px] text-[var(--text-dim)]">#</span>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={6}
          className="w-[72px] h-7 px-2 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-mono focus:border-[var(--accent)] focus:outline-none"
          placeholder="000000"
        />
      </div>
    </div>
  )
}

export { ColorPicker }
export type { ColorPickerProps }
