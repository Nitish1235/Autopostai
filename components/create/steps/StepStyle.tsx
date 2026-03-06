'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { IMAGE_STYLES } from '@/lib/utils/constants'
import type { ImageStyle } from '@/types'

interface StepStyleProps {
  imageStyle: ImageStyle
  onStyleChange: (style: ImageStyle) => void
  customSuffix: string
  onCustomSuffixChange: (suffix: string) => void
}

const STYLE_GRADIENTS: Record<string, string> = {
  cinematic: 'linear-gradient(160deg, #0D2137, #1A4D6E, #C8762A)',
  anime: 'linear-gradient(160deg, #FFB3D9, #B3D9FF, #FFD9B3)',
  dark_fantasy: 'linear-gradient(160deg, #0D0013, #200033, #400060)',
  cyberpunk: 'linear-gradient(160deg, #000D1A, #001F3F, #CC00FF)',
  documentary: 'linear-gradient(160deg, #2C2416, #4A3E2E, #766655)',
  vintage: 'linear-gradient(160deg, #3D2B1F, #7A5C3A, #D4A86A)',
  '3d_render': 'linear-gradient(160deg, #1A1A2E, #16213E, #0F3460)',
  minimal: 'linear-gradient(160deg, #E8E8E8, #F5F5F5, #FFFFFF)',
}

interface PreviewData {
  styleId: string
  imageUrl: string
}

function StepStyle({
  imageStyle,
  onStyleChange,
  customSuffix,
  onCustomSuffixChange,
}: StepStyleProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/styles?public=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const map: Record<string, string> = {}
          data.data.forEach((p: PreviewData) => {
            map[p.styleId] = p.imageUrl
          })
          setPreviews(map)
        }
      })
      .catch(() => { })
  }, [])

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          Choose Your Visual Style
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          This determines the AI image generation style for every scene.
        </p>
      </div>

      {/* Style grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {IMAGE_STYLES.map((style) => {
          const isSelected = imageStyle === style.id
          const previewImage = previews[style.id]
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                'relative overflow-hidden rounded-12 cursor-pointer transition-all',
                'hover:scale-[1.02]',
                isSelected
                  ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]'
                  : 'hover:shadow-lg'
              )}
              style={{ aspectRatio: '9/16' }}
            >
              <div
                className="absolute inset-0"
                style={{ background: STYLE_GRADIENTS[style.id] }}
              />
              {previewImage && (
                <img
                  src={previewImage}
                  alt={style.label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-3 px-3">
                <p className="text-[13px] font-bold text-white">
                  {style.label}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom suffix */}
      <div className="max-w-[500px] mx-auto">
        <Input
          label="Additional style instructions (optional)"
          value={customSuffix}
          onChange={(e) => onCustomSuffixChange(e.target.value)}
          placeholder="e.g. warm color palette, dramatic lighting, close-up portraits"
        />
      </div>
    </div>
  )
}

export { StepStyle }

