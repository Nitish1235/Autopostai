'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Clock, Zap, Calendar as CalendarIcon } from 'lucide-react'
import { PhoneMockup } from '@/components/ui/phone-mockup'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import type { Platform } from '@/types'

interface StepPreviewProps {
  videoId: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  isGenerating: boolean
  generationProgress: number
  generationStage: string
  selectedPlatforms: Platform[]
  onPlatformsChange: (platforms: Platform[]) => void
  scheduledAt: Date | null
  onScheduledAtChange: (date: Date | null) => void
  connectedPlatforms: string[]
  onPublish: () => void
  publishing: boolean
}

const ALL_PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
]

type PostTiming = 'now' | 'schedule' | 'autopilot'

function StepPreview({
  videoId,
  videoUrl,
  thumbnailUrl,
  isGenerating,
  generationProgress,
  generationStage,
  selectedPlatforms,
  onPlatformsChange,
  scheduledAt,
  onScheduledAtChange,
  connectedPlatforms,
  onPublish,
  publishing,
}: StepPreviewProps) {
  const [postTiming, setPostTiming] = useState<PostTiming>('now')
  const [caption, setCaption] = useState('')
  const [captionPlatform, setCaptionPlatform] = useState<Platform>('tiktok')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [published, setPublished] = useState(false)

  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter((p) => p !== platform))
    } else {
      onPlatformsChange([...selectedPlatforms, platform])
    }
  }

  const addTag = () => {
    if (newTag.trim() && !hashtags.includes(newTag.trim())) {
      setHashtags([...hashtags, newTag.trim()])
      setNewTag('')
    }
  }

  const handlePublish = () => {
    onPublish()
    setPublished(true)
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Left - Video preview (55%) */}
      <div className="flex-[0_0_55%] flex items-center justify-center p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] min-h-[650px]">
        <div className="h-[600px] w-auto">
          <PhoneMockup platform="tiktok" className="h-full w-auto">
          {isGenerating ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-primary)] p-6">
              {/* Added time estimate */}
              <div className="mb-6 text-center">
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                  Generating Your Video
                </p>
                <p className="text-[12px] text-[var(--text-dim)]">
                  It will take 2-4 minutes
                </p>
              </div>

              {/* Progress ring */}
              <div className="relative w-24 h-24 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="35"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="40" cy="40" r="35"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={220}
                    animate={{ strokeDashoffset: 220 - (220 * generationProgress) / 100 }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-bold text-[var(--accent)]">
                    {Math.round(generationProgress)}%
                  </span>
                </div>
              </div>

              {/* Added processing text and stage */}
              <div className="text-center space-y-2">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  Video {Math.round(generationProgress)}% processing
                </p>
                <p className="text-[11px] text-[var(--text-dim)] px-4 flex items-center justify-center gap-2">
                  <Loader2 size={10} className="animate-spin" />
                  {generationStage}
                </p>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full relative group">
              <video
                src={videoUrl}
                controls
                autoPlay
                muted
                loop
                className="w-full h-full object-cover rounded-[inherit]"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-black/80 hover:bg-black text-white border-white/20 backdrop-blur"
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = videoUrl
                    a.download = 'generated_video.mp4'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                >
                  ↓ Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-[var(--bg-primary)] flex items-center justify-center rounded-[inherit]">
              <p className="text-[12px] text-[var(--text-dim)]">
                Preview will appear here
              </p>
            </div>
          )}
          </PhoneMockup>
        </div>
      </div>

      {/* Right - Publish controls (45%) */}
      <div className="flex-[0_0_45%] space-y-5">
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
          {isGenerating ? 'Generating...' : published ? 'Published!' : 'Ready to Post'}
        </h2>

        {/* Platform checklist */}
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Platforms
          </p>
          {ALL_PLATFORMS.map((p) => {
            const isConnected = connectedPlatforms.includes(p.id)
            const isSelected = selectedPlatforms.includes(p.id)

            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 px-3 rounded-[8px] border border-[var(--border)]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[p.id] }}
                  />
                  <span className="text-[13px] text-[var(--text-primary)]">
                    {p.label}
                  </span>
                </div>
                {isConnected ? (
                  <Toggle
                    checked={isSelected}
                    onChange={() => togglePlatform(p.id)}
                    size="sm"
                    disabled={isGenerating}
                  />
                ) : (
                  <a
                    href="/platforms"
                    className="text-[11px] text-[var(--accent)] hover:underline"
                  >
                    Connect →
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {/* Post timing */}
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            When to post
          </p>
          <div className="space-y-2">
            {[
              { id: 'now' as PostTiming, icon: <Check size={14} />, label: 'Post now' },
              { id: 'schedule' as PostTiming, icon: <CalendarIcon size={14} />, label: 'Schedule for later' },
              { id: 'autopilot' as PostTiming, icon: <Zap size={14} />, label: 'Add to autopilot queue' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setPostTiming(opt.id)
                  if (opt.id !== 'schedule') onScheduledAtChange(null)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border transition-colors cursor-pointer text-left',
                  postTiming === opt.id
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                )}
              >
                <span className={cn(
                  'text-[14px]',
                  postTiming === opt.id ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
                )}>
                  {opt.icon}
                </span>
                <span className="text-[13px] text-[var(--text-primary)]">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {postTiming === 'schedule' && (
            <input
              type="datetime-local"
              value={
                scheduledAt
                  ? new Date(scheduledAt.getTime() - scheduledAt.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ''
              }
              onChange={(e) =>
                onScheduledAtChange(e.target.value ? new Date(e.target.value) : null)
              }
              className="w-full h-9 px-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] focus:border-[var(--accent)] focus:outline-none"
            />
          )}
        </div>

        {/* Caption */}
        <div>
          <Tabs
            items={ALL_PLATFORMS.map((p) => ({ id: p.id, label: p.label }))}
            active={captionPlatform}
            onChange={(id) => setCaptionPlatform(id as Platform)}
            variant="pill"
          />
          <div className="mt-3">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption for this platform..."
              minHeight={80}
            />
            <p className="text-[10px] text-[var(--text-dim)] mt-1 text-right">
              {caption.length} / {captionPlatform === 'x' ? 280 : 2200}
            </p>
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Hashtags
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)]"
              >
                #{tag}
                <button
                  onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}
                  className="text-[var(--text-dim)] hover:text-[var(--danger)] cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag"
              className="flex-1 h-8 px-3 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] focus:border-[var(--accent)] focus:outline-none"
            />
            <Button size="sm" variant="secondary" onClick={addTag}>
              Add
            </Button>
          </div>
        </div>

        {/* Publish button */}
        <Button
          size="lg"
          className="w-full"
          disabled={isGenerating || selectedPlatforms.length === 0}
          loading={publishing}
          onClick={handlePublish}
        >
          {published ? (
            <>
              <Check size={16} /> Published
            </>
          ) : (
            'Publish →'
          )}
        </Button>
      </div>
    </div>
  )
}

export { StepPreview }
