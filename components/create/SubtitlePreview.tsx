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

const SAMPLE_WORDS = ['This', 'is', 'how', 'your', 'subtitles', 'will', 'look']

function SubtitlePreview({ config, imageStyle }: SubtitlePreviewProps) {
  const [activeWordIndex, setActiveWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % SAMPLE_WORDS.length)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const fontFamily =
    SUBTITLE_FONTS.find((f) => f.id === config.font)?.family || 'Inter'
  const gradient = STYLE_GRADIENTS[imageStyle] || STYLE_GRADIENTS.cinematic

  const getWordStyle = (index: number): React.CSSProperties => {
    const isActive = index === activeWordIndex
    const isSpoken = index < activeWordIndex

    const base: React.CSSProperties = {
      fontFamily,
      fontSize: `${Math.max(8, config.fontSize * 0.3)}px`,
      fontWeight: 800,
      lineHeight: 1.2,
      textTransform: config.uppercase ? 'uppercase' : 'none',
      color: isActive
        ? config.activeColor
        : isSpoken
          ? config.spokenColor
          : config.primaryColor,
      transition: `all ${config.animationDuration}ms ease`,
      display: 'inline-block',
      margin: '0 2px',
    }

    if (config.strokeWidth > 0) {
      base.WebkitTextStroke = `${config.strokeWidth * 0.3}px ${config.strokeColor}`
    }

    if (config.shadow) {
      base.textShadow = '2px 2px 4px rgba(0,0,0,0.8)'
    }

    if (config.glow) {
      base.textShadow = `0 0 10px ${config.activeColor}40, 0 0 20px ${config.activeColor}20`
    }

    if (config.firstWordAccent && index === 0) {
      base.color = config.accentColor
    }

    if (isActive && config.animation === 'pop') {
      base.transform = 'scale(1.15)'
    }

    return base
  }

  return (
    <PhoneMockup platform="tiktok">
      <div
        className="w-full h-full relative"
        style={{ background: gradient }}
      >
        {/* Subtitle area */}
        <div
          className="absolute left-0 right-0 px-3 flex flex-wrap justify-center"
          style={{
            top: `${config.position}%`,
            textAlign: config.alignment,
            justifyContent:
              config.alignment === 'left'
                ? 'flex-start'
                : config.alignment === 'right'
                  ? 'flex-end'
                  : 'center',
          }}
        >
          {config.backgroundBox && (
            <div
              className="absolute inset-0 -mx-1 -my-0.5 rounded"
              style={{
                backgroundColor: config.bgColor,
                opacity: config.bgOpacity,
                borderRadius: `${config.bgRadius || 4}px`,
              }}
            />
          )}
          <div className="relative flex flex-wrap gap-[2px] justify-center">
            {SAMPLE_WORDS.map((word, i) => (
              <span key={i} style={getWordStyle(i)}>
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

export { SubtitlePreview }
