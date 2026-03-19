'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayCircle, PauseCircle, CheckCircle } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { VOICES } from '@/lib/utils/constants'

interface StepVoiceProps {
  voiceId: string
  onVoiceChange: (voiceId: string) => void
  voiceSpeed: number
  onSpeedChange: (speed: number) => void
}

// All available languages from the VOICES list
const ALL_LANGUAGES = ['All', ...Array.from(new Set(VOICES.map((v) => v.language))).sort()]

function StepVoice({ voiceId, onVoiceChange, voiceSpeed, onSpeedChange }: StepVoiceProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [justPlayed, setJustPlayed] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  // Filters
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All')
  const [languageFilter, setLanguageFilter] = useState('All')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Fetch admin-generated voice preview URLs
    fetch('/api/admin/voices?public=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const map: Record<string, string> = {}
          data.data.forEach((p: { voiceId: string; audioUrl: string }) => {
            map[p.voiceId] = p.audioUrl
          })
          setPreviews(map)
        }
      })
      .catch(() => {})

    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.onended = () => {
        setPlayingVoice((prev) => {
          if (prev) {
            setJustPlayed(prev)
            setTimeout(() => setJustPlayed(null), 1200)
          }
          return null
        })
      }
    }
  }, [])

  const handlePlay = (voice: (typeof VOICES)[0], e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return

    if (playingVoice === voice.id) {
      audioRef.current.pause()
      setPlayingVoice(null)
      return
    }

    if (playingVoice) {
      audioRef.current.pause()
    }

    const audioUrl = previews[voice.id]
    if (audioUrl) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(() => {})
      setPlayingVoice(voice.id)
    } else {
      // No preview file — brief simulated play
      setPlayingVoice(voice.id)
      setTimeout(() => {
        setPlayingVoice(null)
        setJustPlayed(voice.id)
        setTimeout(() => setJustPlayed(null), 1200)
      }, 1500)
    }
  }

  // Apply filters
  const filteredVoices = VOICES.filter((v) => {
    const matchGender = genderFilter === 'All' || v.gender === genderFilter
    const matchLang = languageFilter === 'All' || v.language === languageFilter
    return matchGender && matchLang
  })

  return (
    <div className="max-w-[860px] mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">Choose Your Voice</h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          Select the perfect voice for your video narration. Hover to preview.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Gender toggle */}
        <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-1">
          {(['All', 'Male', 'Female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={cn(
                'px-3 py-1 rounded-[6px] text-[12px] font-medium transition-all cursor-pointer',
                genderFilter === g
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {g === 'Male' ? '♂ Male' : g === 'Female' ? '♀ Female' : 'All'}
            </button>
          ))}
        </div>

        {/* Language dropdown */}
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="h-[34px] px-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[12px] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
        >
          {ALL_LANGUAGES.map((lang) => (
            <option 
              key={lang} 
              value={lang}
              className="bg-[#1e1e24] text-white"
            >
              {lang === 'All' ? '🌐 All Languages' : lang}
            </option>
          ))}
        </select>

        {/* Count label */}
        <span className="text-[12px] text-[var(--text-dim)] ml-auto">
          {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Voice grid */}
      {filteredVoices.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-dim)] text-[14px]">
          No voices match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {filteredVoices.map((voice) => {
            const isSelected = voiceId === voice.id
            const isPlaying = playingVoice === voice.id
            const wasJustPlayed = justPlayed === voice.id
            const hasPreview = !!previews[voice.id]

            return (
              <div
                key={voice.id}
                onClick={() => onVoiceChange(voice.id)}
                className={cn(
                  'group relative border rounded-[10px] p-3 cursor-pointer transition-all select-none',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
                )}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative mb-2">
                    <Avatar name={voice.name} size="md" />
                    {/* Playing waveform dots */}
                    {isPlaying && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-[2px] h-3">
                        {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                          <span
                            key={i}
                            className="w-[2px] bg-[var(--accent)] rounded-full animate-[waveform_0.6s_ease-in-out_infinite_alternate]"
                            style={{ animationDelay: `${delay}s`, height: '6px' }}
                          />
                        ))}
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
                    {voice.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                    <Badge variant="dim" size="sm">{voice.accent}</Badge>
                    <Badge
                      variant="dim"
                      size="sm"
                      className={voice.gender === 'Female' ? 'text-pink-400' : 'text-blue-400'}
                    >
                      {voice.gender}
                    </Badge>
                  </div>

                  {/* Tags */}
                  <p className="text-[10px] text-[var(--text-dim)] mt-1 leading-tight">
                    {voice.tags.slice(0, 2).join(' · ')}
                  </p>
                </div>

                {/* Hover / Play overlay — always shown on hover, always shown when playing */}
                <button
                  onClick={(e) => handlePlay(voice, e)}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center rounded-[10px] transition-all duration-150',
                    isPlaying || wasJustPlayed
                      ? 'bg-black/10'
                      : 'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/20'
                  )}
                  title={isPlaying ? 'Pause' : 'Preview voice'}
                >
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all',
                    isPlaying
                      ? 'bg-[var(--accent)] text-white scale-105'
                      : wasJustPlayed
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-black/60 text-white backdrop-blur-sm'
                  )}>
                    {wasJustPlayed ? (
                      <><CheckCircle size={13} /> Done</>
                    ) : isPlaying ? (
                      <><PauseCircle size={13} /> Playing</>
                    ) : (
                      <><PlayCircle size={13} /> {hasPreview ? 'Preview' : 'Play'}</>
                    )}
                  </div>
                </button>

                {/* Selected checkmark */}
                {isSelected && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Speed control */}
      <div className="max-w-[300px] mx-auto">
        <Slider
          label="Speaking Speed"
          value={voiceSpeed}
          onChange={onSpeedChange}
          min={0.75}
          max={1.25}
          step={0.05}
          formatValue={(v) => `${v}×`}
        />
      </div>
    </div>
  )
}

export { StepVoice }
