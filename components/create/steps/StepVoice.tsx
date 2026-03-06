'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayCircle, PauseCircle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
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

function StepVoice({
  voiceId,
  onVoiceChange,
  voiceSpeed,
  onSpeedChange,
}: StepVoiceProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [justPlayed, setJustPlayed] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
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
      .catch(() => { })

    // Create Audio object once
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.onended = () => {
        setPlayingVoice((prev) => {
          if (prev) {
            setJustPlayed(prev)
            setTimeout(() => setJustPlayed(null), 1000)
          }
          return null
        })
      }
    }
  }, [])

  const handlePlay = async (voice: (typeof VOICES)[0]) => {
    if (!audioRef.current) return

    if (playingVoice === voice.id) {
      audioRef.current.pause()
      setPlayingVoice(null)
      return
    }

    const audioUrl = previews[voice.id]

    if (audioUrl) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(() => { })
      setPlayingVoice(voice.id)
    } else {
      // Simulate playback if no audio provided by admin
      setPlayingVoice(voice.id)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setPlayingVoice(null)
      setJustPlayed(voice.id)
      setTimeout(() => setJustPlayed(null), 1000)
    }
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          Choose Your Voice
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          Select the perfect voice for your video narration.
        </p>
      </div>

      {/* Voice grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {VOICES.map((voice) => {
          const isSelected = voiceId === voice.id
          const isPlaying = playingVoice === voice.id
          const wasJustPlayed = justPlayed === voice.id

          return (
            <div
              key={voice.id}
              onClick={() => onVoiceChange(voice.id)}
              className={cn(
                'border rounded-10 p-4 cursor-pointer transition-all',
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <Avatar name={voice.name} size="lg" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mt-3">
                  {voice.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="dim" size="sm">
                    {voice.accent}
                  </Badge>
                  <Badge variant="dim" size="sm">
                    {voice.gender}
                  </Badge>
                </div>

                {/* Waveform bars + play button — only if admin uploaded audio */}
                {previews[voice.id] && (
                  <>
                    {isPlaying && (
                      <div className="flex items-end gap-[3px] h-5 mt-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="waveform-bar"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlay(voice)
                      }}
                      className="mt-3 text-[var(--accent)] hover:scale-110 transition-transform cursor-pointer"
                    >
                      {wasJustPlayed ? (
                        <CheckCircle size={24} className="text-[var(--success)]" />
                      ) : isPlaying ? (
                        <PauseCircle size={24} />
                      ) : (
                        <PlayCircle size={24} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Speed + Pitch controls */}
      <div className="grid grid-cols-2 gap-6 max-w-[500px] mx-auto">
        <Slider
          label="Speed"
          value={voiceSpeed}
          onChange={onSpeedChange}
          min={0.75}
          max={1.25}
          step={0.05}
          formatValue={(v) => `${v}×`}
        />
        <Slider
          label="Pitch"
          value={0}
          onChange={() => { }}
          min={-2}
          max={2}
          step={1}
          formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
        />
      </div>
    </div>
  )
}

export { StepVoice }
