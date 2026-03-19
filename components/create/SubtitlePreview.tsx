'use client'

import { useState, useEffect } from 'react'
import { PhoneMockup } from '@/components/ui/phone-mockup'
import { SUBTITLE_FONTS } from '@/lib/utils/constants'
import type { SubtitleConfig, ImageStyle } from '@/types'

interface SubtitlePreviewProps {
  config: SubtitleConfig
  imageStyle: ImageStyle
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

// Phone mockup renders at ~220px wide representing a 1080px real frame.
// Scale factor: 220/1080 ≈ 0.204.
// We use 0.28 to make the preview text specifically more readable in the UI.
const PREVIEW_SCALE = 0.28

const SAMPLE_WORDS = ['This', 'is', 'how', 'your', 'subtitles', 'will', 'look']

function SubtitlePreview({ config, imageStyle }: SubtitlePreviewProps) {
  const [activeWordIndex, setActiveWordIndex] = useState(0)
  const [bgImage, setBgImage] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % SAMPLE_WORDS.length)
    }, 600)
    
    // Fetch dynamic background
    fetch('/api/admin/subtitle-images?public=true')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          const defaultImg = data.data.find((img: any) => img.isDefault) || data.data[0]
          setBgImage(defaultImg.imageUrl)
        }
      })
      .catch(() => {})

    return () => clearInterval(interval)
  }, [])

  const fontFamily =
    SUBTITLE_FONTS.find((f) => f.id === config.font)?.family || 'Inter'
  const gradient = STYLE_GRADIENTS[imageStyle] || STYLE_GRADIENTS.cinematic

  const scaledFontSize = Math.max(6, Math.round(config.fontSize * PREVIEW_SCALE))
  const scaledStroke = config.strokeWidth * PREVIEW_SCALE

  const getWordStyle = (index: number): React.CSSProperties => {
    const isActive = index === activeWordIndex
    const isSpoken = index < activeWordIndex

    let color = config.primaryColor
    if (isActive) color = config.activeColor
    if (isSpoken) color = config.spokenColor
    if (config.firstWordAccent && index === 0) color = config.accentColor

    const base: React.CSSProperties = {
      fontFamily,
      fontSize: `${scaledFontSize}px`,
      fontWeight: 700,
      lineHeight: 1.1,
      textTransform: config.uppercase ? 'uppercase' : 'none',
      color,
      transition: `all ${config.animationDuration}ms ease`,
      display: 'inline-block',
      margin: '0 1px',
      position: 'relative',
      zIndex: 1,
    }

    if (config.strokeWidth > 0) {
      base.WebkitTextStroke = `${scaledStroke}px ${config.strokeColor}`
    }

    if (config.shadow) {
      base.textShadow = '1px 1px 3px rgba(0,0,0,0.9)'
    }

    if (config.glow) {
      base.textShadow = `0 0 6px ${config.activeColor}60, 0 0 12px ${config.activeColor}30`
    }

    if (isActive && config.animation === 'pop') {
      base.transform = 'scale(1.15)'
    }

    if (isActive && config.animation === 'slideUp') {
      base.transform = 'translateY(-1px)'
    }

    if (isActive && config.animation === 'bounce') {
      base.transform = 'translateY(-2px)'
    }

    return base
  }

  return (
    <PhoneMockup platform="tiktok">
      <div
        className="w-full h-full relative overflow-hidden"
        style={{ background: bgImage ? '#000' : gradient }}
      >
        {bgImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgImage} alt="bg" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}
        {/* Subtitle area */}
        <div
          className="absolute left-0 right-0 px-2"
          style={{
            top: `${config.position}%`,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent:
              config.alignment === 'left'
                ? 'flex-start'
                : config.alignment === 'right'
                  ? 'flex-end'
                  : 'center',
          }}
        >
          {/* Background box — rendered BEHIND words via z-index */}
          {config.backgroundBox && (
            <div
              className="absolute inset-0 rounded"
              style={{
                backgroundColor: config.bgColor,
                opacity: config.bgOpacity,
                borderRadius: `${(config.bgRadius || 4) * PREVIEW_SCALE}px`,
                zIndex: 0,
                margin: '-1px -2px',
                boxShadow: config.shadow ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            />
          )}

          {/* Words */}
          <div className="relative flex flex-col items-center w-full" style={{ zIndex: 1 }}>
            {(() => {
              const chunks = []
              for (let i = 0; i < SAMPLE_WORDS.length; i += config.maxWordsPerLine) {
                chunks.push(SAMPLE_WORDS.slice(i, i + config.maxWordsPerLine))
              }
              return chunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="flex flex-wrap justify-center gap-1">
                  {chunk.map((word, wordIdx) => {
                    const globalIdx = chunkIdx * config.maxWordsPerLine + wordIdx
                    return (
                      <span key={globalIdx} style={getWordStyle(globalIdx)}>
                        {word}
                      </span>
                    )
                  })}
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

export { SubtitlePreview }
