'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils/cn'
import { NICHES } from '@/lib/utils/constants'
import type { VideoFormat } from '@/types'

interface StepTopicProps {
  topic: string
  onTopicChange: (topic: string) => void
  format: VideoFormat
  onFormatChange: (format: VideoFormat) => void
  niche: string
  onNicheChange: (niche: string) => void
  isAiVideo?: boolean
}
const FORMAT_OPTIONS: { id: VideoFormat; label: string }[] = [
  { id: '15s', label: '15s' },
  { id: '30s', label: '30–40s' },
  { id: '60s', label: '60–90s' },
  { id: '90s', label: '90s+' },
]

const TRENDING_TOPICS: Record<string, string[]> = {
  finance: [
    'Why 90% of traders lose money',
    'The $1 investment that became $1M',
    'Credit cards: friend or trap?',
    'How billionaires avoid taxes (legally)',
    'The psychology behind impulse buying',
    'Bitcoin vs Gold in 2026',
    'Side hustles that actually pay',
    'Why the rich stay rich',
  ],
  tech: [
    'AI can now clone your voice in 3 seconds',
    'Why quantum computing changes everything',
    'The dark side of social media algorithms',
    'How hackers steal your data',
    'GPT-5: what we know so far',
    'Smartphones are rewiring your brain',
    'The future of self-driving cars',
    'Why coding bootcamps are dying',
  ],
  health: [
    'What happens when you stop eating sugar',
    'Cold showers: science or myth?',
    'Why you wake up tired every morning',
    'The 5-minute workout that works',
    'Gut health controls your mood',
    'Intermittent fasting mistakes',
    'Sleep hack: the military method',
    'Why walking beats running',
  ],
  default: [
    'The strangest unsolved mystery ever',
    'Why this ancient city was abandoned',
    'The psychology of first impressions',
    'What happens to your body in space',
    'The most dangerous roads on Earth',
    'Why we dream: science explained',
    'Secret codes hidden in plain sight',
    'The truth about productivity hacks',
  ],
}

function StepTopic({
  topic,
  onTopicChange,
  format,
  onFormatChange,
  niche,
  onNicheChange,
  isAiVideo = false,
}: StepTopicProps) {
  const [mode, setMode] = useState<'guided' | 'custom'>(
    niche === 'custom' ? 'custom' : 'guided'
  )
  const [showNicheMenu, setShowNicheMenu] = useState(false)
  const selectedNiche = NICHES.find((n) => n.id === niche)
  const trending = TRENDING_TOPICS[niche] || TRENDING_TOPICS.default

  const handleModeSwitch = (newMode: 'guided' | 'custom') => {
    setMode(newMode)
    if (newMode === 'custom') {
      onNicheChange('custom')
    } else {
      // Revert to a default if they switch back
      if (niche === 'custom') onNicheChange('finance')
    }
  }

  return (
    <div className="max-w-[640px] mx-auto pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
            What&apos;s your video about?
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Describe your topic and we&apos;ll generate the perfect script.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-1">
          <button
            onClick={() => handleModeSwitch('guided')}
            className={cn(
              'px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer',
              mode === 'guided'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Guided
          </button>
          <button
            onClick={() => handleModeSwitch('custom')}
            className={cn(
              'px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer',
              mode === 'custom'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Custom
          </button>
        </div>
      </div>

      <div className="mt-2">
        <Textarea
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder={
            mode === 'guided'
              ? 'e.g. "Why 90% of day traders lose money — break down the psychology..."'
              : 'Type any topic imaginable. We won\'t restrict the AI to a specific niche.'
          }
          autoResize
          minHeight={120}
          className="text-[15px]"
        />
        <div className="flex justify-end mt-1">
          <span className="text-[11px] text-[var(--text-dim)]">
            {topic.length} / 500
          </span>
        </div>
      </div>

      {/* Format + Niche row */}
      <div className="flex items-center justify-between mt-4 gap-4">
        {/* Format selector */}
        <div className="flex gap-1.5">
          {FORMAT_OPTIONS.filter(opt =>
            isAiVideo ? opt.id === '15s' : opt.id !== '15s'
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onFormatChange(opt.id)}
              className={cn(
                'px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all cursor-pointer',
                format === opt.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Niche dropdown (Hidden in Custom mode) */}
        {mode === 'guided' && (
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-[7px] bg-[var(--bg-card)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                {selectedNiche
                  ? `${selectedNiche.emoji} ${selectedNiche.label}`
                  : 'Select niche'}
              </button>
            }
            items={NICHES.filter((n) => n.id !== 'custom').map((n) => ({
              label: `${n.emoji} ${n.label}`,
              onClick: () => onNicheChange(n.id),
            }))}
          />
        )}
      </div>

      {/* Trending topics (Hidden in Custom mode) */}
      {mode === 'guided' && (
        <div className="mt-6">
          <p className="text-[12px] text-[var(--text-dim)] mb-2">
            Trending topics →
          </p>
          <div className="flex flex-wrap gap-2">
            {trending.map((t) => (
              <button
                key={t}
                onClick={() => onTopicChange(t)}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { StepTopic }
