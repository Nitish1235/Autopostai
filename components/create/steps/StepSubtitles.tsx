'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Slider } from '@/components/ui/slider'
import { ColorPicker } from '@/components/ui/color-picker'
import { SubtitlePreview } from '@/components/create/SubtitlePreview'
import { cn } from '@/lib/utils/cn'
import { SUBTITLE_FONTS, SUBTITLE_PRESETS } from '@/lib/utils/constants'
import type { SubtitleConfig, SubtitleAnimation, ImageStyle } from '@/types'

interface StepSubtitlesProps {
  config: SubtitleConfig
  onConfigChange: (config: SubtitleConfig) => void
  imageStyle: ImageStyle
}

const ANIMATION_OPTIONS: { id: SubtitleAnimation; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'pop', label: 'Pop' },
  { id: 'slideUp', label: 'Slide Up' },
  { id: 'fade', label: 'Fade' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'blur', label: 'Blur' },
]

function StepSubtitles({
  config,
  onConfigChange,
  imageStyle,
}: StepSubtitlesProps) {
  const [openSection, setOpenSection] = useState<string | null>('size')

  const update = (partial: Partial<SubtitleConfig>) => {
    onConfigChange({ ...config, ...partial })
  }

  const applyPreset = (presetId: string) => {
    const preset = SUBTITLE_PRESETS[presetId]
    if (!preset) return
    update({
      font: preset.font,
      fontSize: preset.fontSize,
      primaryColor: preset.primaryColor,
      activeColor: preset.activeColor,
      spokenColor: preset.spokenColor,
      firstWordAccent: preset.firstWordAccent,
      strokeColor: preset.strokeColor,
      strokeWidth: preset.strokeWidth,
      backgroundBox: preset.backgroundBox,
      bgColor: preset.bgColor || '#000000',
      bgOpacity: preset.bgOpacity || 0.8,
      animation: preset.animation,
      uppercase: preset.uppercase,
      maxWordsPerLine: preset.maxWordsPerLine,
      glow: preset.glow || false,
    })
  }

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id)
  }

  return (
    <div className="flex gap-6">
      {/* Left controls (55%) */}
      <div className="flex-[0_0_55%] space-y-4">
        {/* Font selector */}
        <div>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Font
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SUBTITLE_FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => update({ font: font.id })}
                className={cn(
                  'shrink-0 w-20 h-[52px] rounded-[8px] flex flex-col items-center justify-center border transition-colors cursor-pointer',
                  config.font === font.id
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
                )}
              >
                <span
                  className="text-[13px] text-[var(--text-primary)]"
                  style={{ fontFamily: font.family }}
                >
                  Aa
                </span>
                <span className="text-[8px] text-[var(--text-dim)] mt-0.5">
                  {font.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Presets
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(SUBTITLE_PRESETS).map((id) => (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className="px-3 py-1.5 rounded-[7px] bg-[var(--bg-card)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent)] transition-colors cursor-pointer capitalize"
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion sections */}
        <div className="space-y-1">
          {/* SIZE & SPACING */}
          <AccordionSection
            title="Size & Spacing"
            isOpen={openSection === 'size'}
            onToggle={() => toggleSection('size')}
          >
            <Slider
              label="Font Size"
              value={config.fontSize}
              onChange={(v) => update({ fontSize: v })}
              min={14}
              max={52}
              step={1}
            />
            <div className="mt-4">
              <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                Max words per line
              </p>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => update({ maxWordsPerLine: n })}
                    className={cn(
                      'px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all cursor-pointer',
                      config.maxWordsPerLine === n
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* COLORS */}
          <AccordionSection
            title="Colors"
            isOpen={openSection === 'colors'}
            onToggle={() => toggleSection('colors')}
          >
            <div className="space-y-3">
              <ColorPicker
                label="Primary Color"
                value={config.primaryColor}
                onChange={(v) => update({ primaryColor: v })}
              />
              <ColorPicker
                label="Active Color"
                value={config.activeColor}
                onChange={(v) => update({ activeColor: v })}
              />
              <ColorPicker
                label="Spoken Color"
                value={config.spokenColor}
                onChange={(v) => update({ spokenColor: v })}
              />
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  First word accent
                </span>
                <Toggle
                  checked={config.firstWordAccent}
                  onChange={(v) => update({ firstWordAccent: v })}
                  size="sm"
                />
              </div>
              {config.firstWordAccent && (
                <ColorPicker
                  label="Accent Color"
                  value={config.accentColor}
                  onChange={(v) => update({ accentColor: v })}
                />
              )}
              <ColorPicker
                label="Stroke Color"
                value={config.strokeColor}
                onChange={(v) => update({ strokeColor: v })}
              />
              <Slider
                label="Stroke Width"
                value={config.strokeWidth}
                onChange={(v) => update({ strokeWidth: v })}
                min={0}
                max={6}
                step={1}
              />
            </div>
          </AccordionSection>

          {/* EFFECTS */}
          <AccordionSection
            title="Effects"
            isOpen={openSection === 'effects'}
            onToggle={() => toggleSection('effects')}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Background box
                </span>
                <Toggle
                  checked={config.backgroundBox}
                  onChange={(v) => update({ backgroundBox: v })}
                  size="sm"
                />
              </div>
              {config.backgroundBox && (
                <>
                  <ColorPicker
                    label="Background Color"
                    value={config.bgColor}
                    onChange={(v) => update({ bgColor: v })}
                  />
                  <Slider
                    label="Opacity"
                    value={config.bgOpacity}
                    onChange={(v) => update({ bgOpacity: v })}
                    min={0}
                    max={1}
                    step={0.05}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Drop shadow
                </span>
                <Toggle
                  checked={config.shadow}
                  onChange={(v) => update({ shadow: v })}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Glow
                </span>
                <Toggle
                  checked={config.glow}
                  onChange={(v) => update({ glow: v })}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Uppercase
                </span>
                <Toggle
                  checked={config.uppercase}
                  onChange={(v) => update({ uppercase: v })}
                  size="sm"
                />
              </div>
            </div>
          </AccordionSection>

          {/* ANIMATION */}
          <AccordionSection
            title="Animation"
            isOpen={openSection === 'animation'}
            onToggle={() => toggleSection('animation')}
          >
            <div className="flex flex-wrap gap-1.5 mb-4">
              {ANIMATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update({ animation: opt.id })}
                  className={cn(
                    'px-3 py-1.5 rounded-[7px] text-[11px] font-medium transition-all cursor-pointer',
                    config.animation === opt.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Slider
              label="Duration"
              value={config.animationDuration}
              onChange={(v) => update({ animationDuration: v })}
              min={80}
              max={400}
              step={20}
              formatValue={(v) => `${v}ms`}
            />
          </AccordionSection>

          {/* POSITION */}
          <AccordionSection
            title="Position"
            isOpen={openSection === 'position'}
            onToggle={() => toggleSection('position')}
          >
            <Slider
              label="Vertical Position"
              value={config.position}
              onChange={(v) => update({ position: v })}
              min={0}
              max={100}
              step={1}
              formatValue={(v) => `${v}%`}
            />
            <div className="mt-4">
              <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                Alignment
              </p>
              <div className="flex gap-1.5">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => update({ alignment: a })}
                    className={cn(
                      'px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all cursor-pointer capitalize',
                      config.alignment === a
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* Right preview (45%) */}
      <div className="flex-[0_0_45%]">
        <div className="sticky top-[80px] flex justify-center">
          <SubtitlePreview config={config} imageStyle={imageStyle} />
        </div>
      </div>
    </div>
  )
}

function AccordionSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-[var(--border)] rounded-[8px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      >
        {title}
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export { StepSubtitles }
