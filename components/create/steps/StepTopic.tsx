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
}

const FORMAT_OPTIONS: { id: VideoFormat; label: string }[] = [
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
}: StepTopicProps) {
  const [showNicheMenu, setShowNicheMenu] = useState(false)
  const selectedNiche = NICHES.find((n) => n.id === niche)
  const trending = TRENDING_TOPICS[niche] || TRENDING_TOPICS.default

  return (
    <div className="max-w-[640px] mx-auto pt-8">
      <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
        What&apos;s your video about?
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1">
        Describe your topic and we&apos;ll generate the perfect script.
      </p>

      <div className="mt-6">
        <Textarea
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder={`e.g. "Why 90% of day traders lose money — break down the psychology of FOMO, revenge trading, and overconfidence. Include real statistics and end with 3 actionable tips."`}
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
          {FORMAT_OPTIONS.map((opt) => (
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

        {/* Niche dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-[7px] bg-[var(--bg-card)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
              {selectedNiche ? `${selectedNiche.emoji} ${selectedNiche.label}` : 'Select niche'}
            </button>
          }
          items={NICHES.map((n) => ({
            label: `${n.emoji} ${n.label}`,
            onClick: () => onNicheChange(n.id),
          }))}
        />
      </div>

      {/* Trending topics */}
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
    </div>
  )
}

export { StepTopic }
