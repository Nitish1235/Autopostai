'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Zap, Clock, Minus, Plus, Video, Image as ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Dropdown } from '@/components/ui/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Tabs } from '@/components/ui/tabs'
import { ScheduleGrid } from '@/components/autopilot/ScheduleGrid'
import { TopicQueue } from '@/components/autopilot/TopicQueue'
import { cn } from '@/lib/utils/cn'
import { NICHES, IMAGE_STYLES, VOICES } from '@/lib/utils/constants'
import type {
  AutopilotConfig,
  WeeklySchedule,
  VideoFormat,
  ImageStyle,
  TopicQueue as TopicQueueType,
} from '@/types'

const FORMAT_OPTIONS: { id: VideoFormat; label: string }[] = [
  { id: '15s', label: '15s' },
  { id: '30s', label: '30s' },
  { id: '60s', label: '60s' },
  { id: '90s', label: '90s' },
]

const STYLE_GRADIENTS: Record<string, string> = {
  cinematic:    'linear-gradient(160deg, #0D2137, #1A4D6E, #C8762A)',
  anime:        'linear-gradient(160deg, #FFB3D9, #B3D9FF, #FFD9B3)',
  dark_fantasy: 'linear-gradient(160deg, #0D0013, #200033, #400060)',
  cyberpunk:    'linear-gradient(160deg, #000D1A, #001F3F, #CC00FF)',
  documentary:  'linear-gradient(160deg, #2C2416, #4A3E2E, #766655)',
  vintage:      'linear-gradient(160deg, #3D2B1F, #7A5C3A, #D4A86A)',
  '3d_render':  'linear-gradient(160deg, #1A1A2E, #16213E, #0F3460)',
  minimal:      'linear-gradient(160deg, #E8E8E8, #F5F5F5, #FFFFFF)',
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday:    [{ time: '09:00', platform: 'tiktok',    enabled: true }],
  tuesday:   [{ time: '12:00', platform: 'instagram', enabled: true }],
  wednesday: [{ time: '09:00', platform: 'tiktok',    enabled: true }],
  thursday:  [{ time: '18:00', platform: 'youtube',   enabled: true }],
  friday:    [{ time: '09:00', platform: 'tiktok',    enabled: true }],
  saturday:  [],
  sunday:    [],
}

function timeUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not scheduled'
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Any moment now'
  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function AutopilotPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.isAdmin ?? false

  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState<'planner' | 'queue' | 'settings'>('planner')

  // Config state
  const [enabled,        setEnabled]        = useState(false)
  const [niche,          setNiche]          = useState('finance')
  const [format,         setFormat]         = useState<VideoFormat>('60s')
  const [postsPerDay,    setPostsPerDay]    = useState(2)
  const [imageStyle,     setImageStyle]     = useState<ImageStyle>('cinematic')
  const [voiceId,        setVoiceId]        = useState('Noah')
  const [generationMode, setGenerationMode] = useState<'image_stack' | 'ai_video'>('image_stack')
  const [approvalMode,   setApprovalMode]   = useState<'review' | 'autopilot'>('review')
  const [schedule,       setSchedule]       = useState<WeeklySchedule>(DEFAULT_SCHEDULE)
  const [aiOptimize,     setAiOptimize]     = useState(false)
  const [topics,         setTopics]         = useState<TopicQueueType[]>([])
  const [nextRunAt,      setNextRunAt]      = useState<string | null>(null)
  const [stylePreviews,  setStylePreviews]  = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/autopilot')
        if (!res.ok) {
          toast({ message: 'Failed to load autopilot config', type: 'error' })
          return
        }
        const data = await res.json()
        if (data.success && data.data) {
          const cfg = data.data
          setEnabled(cfg.enabled ?? false)
          setNiche(cfg.niche || 'finance')
          setFormat((cfg.format as VideoFormat) || '60s')
          setPostsPerDay(cfg.postsPerDay ?? 2)
          setImageStyle((cfg.imageStyle as ImageStyle) || 'cinematic')
          setVoiceId(cfg.voiceId || 'Noah')
          setGenerationMode(cfg.generationMode || 'image_stack')
          setApprovalMode(cfg.approvalMode || 'review')
          if (cfg.schedule) {
            try {
              const parsed = typeof cfg.schedule === 'string' ? JSON.parse(cfg.schedule) : cfg.schedule
              setSchedule(parsed)
            } catch {
              setSchedule(DEFAULT_SCHEDULE)
            }
          }
          setAiOptimize(cfg.aiOptimizeTime ?? false)
          setNextRunAt(cfg.nextRunAt ?? null)
        }

        const topicsRes = await fetch('/api/autopilot/topics')
        if (topicsRes.ok) {
          const topicsData = await topicsRes.json()
          if (topicsData.success && Array.isArray(topicsData.data?.topics)) {
            setTopics(topicsData.data.topics)
          }
        }

        const stylesRes = await fetch('/api/admin/styles?public=true')
        if (stylesRes.ok) {
          const stylesData = await stylesRes.json()
          if (stylesData.success && stylesData.data) {
            const map: Record<string, string> = {}
            stylesData.data.forEach((p: { styleId: string; imageUrl: string }) => {
                map[p.styleId] = p.imageUrl
            })
            setStylePreviews(map)
          }
        }
      } catch {
        toast({ message: 'Failed to load autopilot config', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [toast])

  // Force 15s for AI Video
  useEffect(() => {
    if (generationMode === 'ai_video' && format !== '15s') {
      setFormat('15s')
    }
  }, [generationMode, format])

  const handleToggle = useCallback(async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      const data = await res.json()
      if (data.success) {
        setEnabled(!enabled)
        toast({ message: enabled ? 'Autopilot paused' : 'Autopilot resumed!', type: 'success' })
      } else {
        toast({ message: data.error || 'Failed to toggle', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    } finally {
      setToggling(false)
    }
  }, [enabled, toast])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/autopilot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche, format, postsPerDay, imageStyle, voiceId,
          generationMode, approvalMode, schedule,
          aiOptimizeTime: aiOptimize,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ message: 'Settings saved!', type: 'success' })
      } else {
        toast({ message: data.error || 'Failed to save', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [niche, format, postsPerDay, imageStyle, voiceId, generationMode, approvalMode, schedule, aiOptimize, toast])

  const handleGenerateNow = useCallback(async (topicId: string) => {
    toast({ message: 'Queued for generation!', type: 'info' })
    try {
      await fetch('/api/autopilot/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, action: 'generate' }),
      })
    } catch {
      toast({ message: 'Failed to start generation', type: 'error' })
    }
  }, [toast])

  const selectedNiche = NICHES.find((n) => n.id === niche)
  const maxPostsPerDay = isAdmin ? 24 : 6

  if (loading) {
    return (
      <div className="px-8 py-7 max-w-[1200px] space-y-4">
        <Skeleton width="100%" height={140} rounded="lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton width="100%" height={300} rounded="lg" />
          <Skeleton width="100%" height={300} rounded="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-7 max-w-[1200px]">

      {/* ── STATUS HERO CARD ─────────────────────────────── */}
      <div className={cn(
        'relative overflow-hidden rounded-[14px] p-7 mb-5 border',
        enabled
          ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)]'
          : 'bg-[var(--bg-card)] border-[var(--border)]'
      )}>
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--accent)] opacity-[0.06] blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex-[0_0_60%]">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'w-2.5 h-2.5 rounded-full',
                enabled ? 'bg-[var(--success)] pulse-dot' : 'bg-[var(--text-dim)]'
              )} />
              <span className="text-[16px] font-bold tracking-[1px] uppercase text-[var(--text-primary)]">
                {enabled ? 'Autopilot Running' : 'Autopilot Paused'}
              </span>
            </div>
            {enabled ? (
              <>
                <p className="text-[15px] text-[var(--text-primary)] mt-1">
                  Next video generates in{' '}
                  <span className="font-semibold">{timeUntil(nextRunAt)}</span>
                </p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  {topics.filter((t) => t.status === 'pending').length} topics queued
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                Configure your schedule in the Planner tab, then enable autopilot.
              </p>
            )}
          </div>
          <div className="flex-[0_0_40%] flex justify-end">
            <Button
              onClick={handleToggle}
              loading={toggling}
              className={cn(
                'h-11 px-6 rounded-[9px] font-semibold text-[14px]',
                enabled
                  ? 'bg-[var(--danger)]/15 border border-[var(--danger)]/25 text-[var(--danger)] hover:bg-[var(--danger)]/25'
                  : 'bg-[var(--success)]/15 border border-[var(--success)]/25 text-[var(--success)] hover:bg-[var(--success)]/25'
              )}
              variant="ghost"
            >
              {enabled ? '⏸ Pause Autopilot' : '▶ Enable Autopilot'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────── */}
      <div className="mb-6">
        <Tabs
          items={[
            { id: 'planner', label: '📅 Planner' },
            { id: 'queue',   label: '📋 Topic Queue' },
            { id: 'settings', label: '⚙️ Settings' },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'planner' | 'queue' | 'settings')}
          variant="pill"
        />
      </div>

      {/* ── TAB: PLANNER ─────────────────────────────────── */}
      {activeTab === 'planner' && (
        <div className="space-y-5">
          {/* Defaults block */}
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Default Settings
              <span className="text-[11px] font-normal text-[var(--text-secondary)] ml-2">
                Applied to all auto-generated videos
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Generation Mode */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Generation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGenerationMode('image_stack')}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-[10px] border transition-all cursor-pointer',
                      generationMode === 'image_stack'
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                    )}
                  >
                    <ImageIcon size={16} />
                    <div className="text-left">
                      <p className="text-[12px] font-bold">Standard</p>
                      <p className="text-[10px] opacity-70 italic">Image stacks</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setGenerationMode('ai_video')}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-[10px] border transition-all cursor-pointer',
                      generationMode === 'ai_video'
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                    )}
                  >
                    <Video size={16} />
                    <div className="text-left">
                      <p className="text-[12px] font-bold">AI Video</p>
                      <p className="text-[10px] opacity-70 italic">Sora-2 clips</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Niche */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">Niche</label>
                <Dropdown
                  align="left"
                  trigger={
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                      {selectedNiche ? `${selectedNiche.emoji} ${selectedNiche.label}` : 'Select niche'}
                    </button>
                  }
                  items={NICHES.map((n) => ({ label: `${n.emoji} ${n.label}`, onClick: () => setNiche(n.id) }))}
                />
              </div>

              {/* Format */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">Format</label>
                <div className="flex gap-1.5">
                  {FORMAT_OPTIONS.filter(opt => 
                    generationMode === 'ai_video' ? opt.id === '15s' : opt.id !== '15s'
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormat(opt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all cursor-pointer',
                        format === opt.id
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">Voice</label>
                <Dropdown
                  align="left"
                  trigger={
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer capitalize">
                      {VOICES.find((v) => v.id === voiceId)?.name || voiceId}
                    </button>
                  }
                  items={VOICES.filter((v) => v.language === 'English').map((v) => ({
                    label: `${v.name} — ${v.accent} ${v.gender}`,
                    onClick: () => setVoiceId(v.id),
                  }))}
                />
              </div>

              {/* Image style */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  {generationMode === 'image_stack' ? 'Image Style' : 'AI Video Style'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {IMAGE_STYLES.slice(0, 4).map((s) => {
                    const previewImage = stylePreviews[s.id]
                    return (
                      <button
                        key={s.id}
                        onClick={() => setImageStyle(s.id)}
                        className={cn(
                          'aspect-square rounded-[8px] overflow-hidden relative cursor-pointer transition-all',
                          imageStyle === s.id
                            ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-primary)]'
                            : 'hover:scale-105'
                        )}
                      >
                        <div className="absolute inset-0" style={{ background: STYLE_GRADIENTS[s.id] }} />
                        {previewImage && (
                          <img
                            src={previewImage}
                            alt={s.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute bottom-1 left-1 text-[8px] text-white font-medium z-10 drop-shadow-md">
                          {s.label.split(' ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Schedule */}
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Weekly Schedule
              <span className="text-[11px] font-normal text-[var(--text-secondary)] ml-2">
                Slots with 🚫 have already passed this week
              </span>
            </h3>
            <ScheduleGrid
              schedule={schedule}
              onScheduleChange={setSchedule}
              aiOptimize={aiOptimize}
              onAiOptimizeChange={setAiOptimize}
            />
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              Save Planner Settings
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB: QUEUE ───────────────────────────────────── */}
      {activeTab === 'queue' && (
        <Card padding="md">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
            Topic Queue
            <span className="text-[11px] font-normal text-[var(--text-secondary)] ml-2">
              Topics are picked up and generated on schedule automatically
            </span>
          </h3>
          <TopicQueue
            topics={topics}
            onTopicsChange={setTopics}
            onGenerateNow={handleGenerateNow}
          />
        </Card>
      )}

      {/* ── TAB: SETTINGS ────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">

          {/* Approval Mode */}
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Approval Mode</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setApprovalMode('review')}
                className={cn(
                  'p-4 rounded-[10px] border text-left transition-all cursor-pointer',
                  approvalMode === 'review'
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                )}
              >
                <Clock size={20} className="text-[var(--accent)] mb-2" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">Review First</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Video goes to your inbox for 24h approval before posting
                </p>
              </button>
              <button
                onClick={() => setApprovalMode('autopilot')}
                className={cn(
                  'p-4 rounded-[10px] border text-left transition-all cursor-pointer',
                  approvalMode === 'autopilot'
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                )}
              >
                <Zap size={20} className="text-[var(--accent)] mb-2" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">Full Autopilot</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Posts automatically on schedule without review
                </p>
              </button>
            </div>
          </Card>

          {/* Posts per day cap */}
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">Daily Post Limit</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPostsPerDay(Math.max(1, postsPerDay - 1))}
                className="w-8 h-8 rounded-[7px] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
              >
                <Minus size={14} />
              </button>
              <span className="text-[18px] font-bold text-[var(--text-primary)] w-8 text-center">
                {postsPerDay}
              </span>
              <button
                onClick={() => setPostsPerDay(Math.min(maxPostsPerDay, postsPerDay + 1))}
                className="w-8 h-8 rounded-[7px] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
              <span className="text-[12px] text-[var(--text-secondary)]">posts/day max</span>
            </div>
            {isAdmin && (
              <p className="text-[10px] text-[var(--accent)] mt-1 font-medium">✨ Admin: Up to 24/day</p>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              Save Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
