'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { StepMode } from '@/components/create/steps/StepMode'
import { StepTopic } from '@/components/create/steps/StepTopic'
import { StepScript } from '@/components/create/steps/StepScript'
import { StepVoice } from '@/components/create/steps/StepVoice'
import { StepStyle } from '@/components/create/steps/StepStyle'
import { StepSubtitles } from '@/components/create/steps/StepSubtitles'
import { StepAudio } from '@/components/create/steps/StepAudio'
import { StepPreview } from '@/components/create/steps/StepPreview'
import { useToast } from '@/components/ui/toast'
import { useUser } from '@/hooks/useUser'
import type {
  ScriptSegment,
  VideoFormat,
  ImageStyle,
  MusicMood,
  SubtitleConfig,
  Platform,
  GenerationMode,
  AiAudioMode,
} from '@/types'

const IMAGE_STACK_STEPS = [
  { id: 'mode', label: 'Mode' },
  { id: 'topic', label: 'Topic' },
  { id: 'script', label: 'Script' },
  { id: 'voice', label: 'Voice' },
  { id: 'style', label: 'Style' },
  { id: 'subtitles', label: 'Subtitles' },
  { id: 'preview', label: 'Preview' },
]

const AI_VIDEO_STEPS = [
  { id: 'mode', label: 'Mode' },
  { id: 'topic', label: 'Topic' },
  { id: 'audio', label: 'Audio' },
  { id: 'preview', label: 'Preview' },
]

const DEFAULT_SUBTITLE_CONFIG: SubtitleConfig = {
  font: 'impact',
  fontSize: 42,
  primaryColor: '#FFFFFF',
  activeColor: '#FFE500',
  spokenColor: '#AAAAAA',
  firstWordAccent: false,
  accentColor: '#FF2D55',
  strokeColor: '#000000',
  strokeWidth: 4,
  backgroundBox: false,
  bgColor: '#000000',
  bgOpacity: 0.8,
  bgRadius: 4,
  shadow: true,
  glow: false,
  animation: 'pop',
  animationDuration: 200,
  position: 75,
  alignment: 'center',
  maxWordsPerLine: 2,
  uppercase: true,
}

function CreateWizard() {
  const { toast } = useToast()
  const { user } = useUser()

  const [currentStep, setCurrentStep] = useState(0)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image_stack')
  const [aiAudioMode, setAiAudioMode] = useState<AiAudioMode>('keep_ai')
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState(user?.defaultNiche || 'finance')
  const [format, setFormat] = useState<VideoFormat>(
    (user?.defaultFormat as VideoFormat) || '60s'
  )
  const [script, setScript] = useState<ScriptSegment[]>([])
  const [voiceId, setVoiceId] = useState(user?.defaultVoiceId || 'ryan')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [imageStyle, setImageStyle] = useState<ImageStyle>(
    (user?.defaultStyle as ImageStyle) || 'cinematic'
  )
  const [customSuffix, setCustomSuffix] = useState('')
  const [musicMood, setMusicMood] = useState<MusicMood>('upbeat')
  const [musicVolume, setMusicVolume] = useState(0.3)
  const [subtitleConfig, setSubtitleConfig] =
    useState<SubtitleConfig>(DEFAULT_SUBTITLE_CONFIG)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    'tiktok',
  ])
  const searchParams = useSearchParams()
  const initialScheduledAt = searchParams.get('scheduledAt')
  const [scheduledAt, setScheduledAt] = useState<Date | null>(
    initialScheduledAt ? new Date(initialScheduledAt) : null
  )
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState('')
  const [publishing, setPublishing] = useState(false)

  // ── Resumability Logic ──────────────────────────────
  
  // 1. Save videoId to localStorage
  useEffect(() => {
    if (videoId) {
      localStorage.setItem('autopost_draft_video_id', videoId)
    }
  }, [videoId])

  // 2. Clear draft
  const handleClearDraft = useCallback(() => {
    localStorage.removeItem('autopost_draft_video_id')
    setVideoId(null)
    setVideoUrl(null)
    setThumbnailUrl(null)
    setTopic('')
    setScript([])
    setCurrentStep(0)
  }, [])

  // 3. Re-hydrate on mount
  useEffect(() => {
    const savedId = localStorage.getItem('autopost_draft_video_id')
    if (savedId && !videoId) {
      const rehydrate = async () => {
        try {
          const res = await fetch(`/api/video/${savedId}`)
          const data = await res.json()
          if (data.success && data.data) {
            const v = data.data
            // Don't re-hydrate if already posted
            if (v.status === 'posted') {
              localStorage.removeItem('autopost_draft_video_id')
              return
            }

            setVideoId(v.id)
            setTopic(v.topic || '')
            setNiche(v.niche || 'finance')
            setFormat(v.format || '60s')
            setScript(v.script || [])
            setVoiceId(v.voiceId || 'ryan')
            setImageStyle(v.imageStyle || 'cinematic')
            setMusicMood(v.musicMood || 'upbeat')
            setSubtitleConfig(v.subtitleConfig || DEFAULT_SUBTITLE_CONFIG)
            setSelectedPlatforms(v.platforms || ['tiktok'])
            setVideoUrl(v.videoUrl)
            setThumbnailUrl(v.thumbnailUrl)
            setGenerationMode(v.generationMode || 'image_stack')
            
            // If it has a video URL or is rendering, skip to preview
            if (v.videoUrl || ['rendering', 'ready', 'failed'].includes(v.status)) {
              const isAi = (v.generationMode || 'image_stack') === 'ai_video'
              setCurrentStep(isAi ? AI_VIDEO_STEPS.length - 1 : IMAGE_STACK_STEPS.length - 1)
            }
          }
        } catch (err) {
          console.error('Re-hydration failed:', err)
        }
      }
      rehydrate()
    }
  }, [videoId]) // Only run if no videoId is currently active

  const isAiVideo = generationMode === 'ai_video'
  const steps = isAiVideo ? AI_VIDEO_STEPS : IMAGE_STACK_STEPS
  const previewStepIndex = steps.length - 1
  const lastEditableStepIndex = previewStepIndex - 1

  const connectedPlatforms =
    user?.platformConnections
      ?.filter((c) => c.connected)
      .map((c) => c.platform) || []

  const handleGenerateScript = useCallback(async () => {
    if (topic.length < 10) {
      toast({ message: 'Topic must be at least 10 characters', type: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, niche, format }),
      })

      const data = await res.json()
      if (data.success && data.data?.segments) {
        setScript(data.data.segments)
        setCurrentStep(2) // Step 2 = script in image_stack mode
        toast({ message: 'Script generated!', type: 'success' })
      } else {
        toast({
          message: data.error || 'Failed to generate script',
          type: 'error',
        })
      }
    } catch {
      toast({ message: 'Network error. Try again.', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }, [topic, niche, format, toast])

  const handleCreateVideo = useCallback(async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStage('Creating video...')
    setCurrentStep(previewStepIndex)

    try {
      const res = await fetch('/api/video/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          niche,
          format,
          script: isAiVideo ? undefined : script,
          voiceId,
          voiceSpeed,
          imageStyle,
          customSuffix,
          musicMood,
          musicVolume,
          subtitleConfig,
          platforms: selectedPlatforms,
          scheduledAt,
          generationMode,
          aiAudioMode: isAiVideo ? aiAudioMode : undefined,
        }),
      })

      const data = await res.json()
      if (data.success && data.data?.videoId) {
        const newVideoId = data.data.videoId
        setVideoId(newVideoId)
        toast({ message: 'Video creation started!', type: 'success' })

        // Poll real video status every 3 seconds, timeout after 10 minutes
        const STAGE_LABELS: Record<string, string> = {
          script: 'Generating script...',
          images: 'Generating images...',
          voice: 'Generating voice...',
          render: 'Rendering video...',
          upload: 'Uploading...',
          ai_generate: 'Generating AI video...',
        }

        const MAX_POLLS = 200 // 200 * 3s = 10 minutes
        let pollCount = 0

        const poll = setInterval(async () => {
          pollCount++

          // Safety timeout: stop after 10 minutes
          if (pollCount > MAX_POLLS) {
            clearInterval(poll)
            setIsGenerating(false)
            setGenerationStage('Timed out')
            toast({ message: 'Video generation is taking too long. Check your dashboard for updates.', type: 'error' })
            return
          }

          try {
            const statusRes = await fetch(`/api/video/${newVideoId}/status`)
            const statusData = await statusRes.json()

            if (!statusData.success) {
              clearInterval(poll)
              setIsGenerating(false)
              toast({ message: statusData.error || 'Video generation failed', type: 'error' })
              return
            }

            const { status, stage, progress, videoUrl: vUrl, thumbnailUrl: tUrl, error } = statusData.data

            if (progress >= 0) {
              setGenerationProgress(progress)
            }
            if (stage && STAGE_LABELS[stage]) {
              setGenerationStage(STAGE_LABELS[stage])
            }

            if (status === 'ready' || status === 'scheduled' || status === 'posted') {
              clearInterval(poll)
              setGenerationProgress(100)
              setGenerationStage('Complete!')
              setIsGenerating(false)
              if (vUrl) setVideoUrl(vUrl)
              if (tUrl) setThumbnailUrl(tUrl)
              toast({ message: '🎬 Your video is ready!', type: 'success' })
            } else if (status === 'failed') {
              clearInterval(poll)
              setIsGenerating(false)
              toast({ message: error || 'Video generation failed. Credit refunded.', type: 'error' })
            }
          } catch {
            // Network error during poll — keep trying
          }
        }, 3000)
      } else {
        toast({
          message: data.error || 'Failed to create video',
          type: 'error',
        })
        setIsGenerating(false)
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
      setIsGenerating(false)
    }
  }, [
    topic,
    niche,
    format,
    script,
    voiceId,
    voiceSpeed,
    imageStyle,
    customSuffix,
    musicMood,
    musicVolume,
    subtitleConfig,
    selectedPlatforms,
    scheduledAt,
    generationMode,
    aiAudioMode,
    isAiVideo,
    previewStepIndex,
    toast,
  ])

  const handlePublish = useCallback(async () => {
    if (!videoId) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/publish/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          scheduledAt,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ message: 'Video published successfully!', type: 'success' })
      } else {
        toast({ message: data.error || 'Failed to publish', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    } finally {
      setPublishing(false)
    }
  }, [videoId, selectedPlatforms, scheduledAt, toast])

  const canGoNext = (): boolean => {
    const stepId = steps[currentStep]?.id
    switch (stepId) {
      case 'mode':
        return !!generationMode
      case 'topic':
        return topic.length >= 10
      case 'script':
        return script.length > 0
      case 'voice':
        return !!voiceId
      case 'style':
        return !!imageStyle
      case 'subtitles':
        return true
      case 'audio':
        return !!aiAudioMode
      default:
        return false
    }
  }

  const handleNext = () => {
    const stepId = steps[currentStep]?.id

    // Image Stack: topic step triggers script generation
    if (stepId === 'topic' && !isAiVideo) {
      handleGenerateScript()
      return
    }

    // Last editable step triggers video creation
    if (currentStep === lastEditableStepIndex) {
      handleCreateVideo()
      return
    }

    if (currentStep < previewStepIndex) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const getCTALabel = (): string => {
    const stepId = steps[currentStep]?.id
    if (stepId === 'mode') return 'Continue →'
    if (stepId === 'topic' && !isAiVideo) return 'Generate Script →'
    if (currentStep === lastEditableStepIndex) return isAiVideo ? 'Generate AI Video →' : 'Generate Video →'
    return 'Continue →'
  }

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-7">
      {/* Stepper */}
      <div className="mb-8">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="min-h-[500px]">
        {steps[currentStep]?.id === 'mode' && (
          <StepMode
            generationMode={generationMode}
            onChange={setGenerationMode}
          />
        )}
        {steps[currentStep]?.id === 'topic' && (
          <StepTopic
            topic={topic}
            onTopicChange={setTopic}
            format={format}
            onFormatChange={setFormat}
            niche={niche}
            onNicheChange={setNiche}
          />
        )}
        {steps[currentStep]?.id === 'script' && (
          <StepScript
            script={script}
            onScriptChange={setScript}
            imageStyle={imageStyle}
            voiceId={voiceId}
          />
        )}
        {steps[currentStep]?.id === 'voice' && (
          <StepVoice
            voiceId={voiceId}
            onVoiceChange={setVoiceId}
            voiceSpeed={voiceSpeed}
            onSpeedChange={setVoiceSpeed}
          />
        )}
        {steps[currentStep]?.id === 'style' && (
          <StepStyle
            imageStyle={imageStyle}
            onStyleChange={setImageStyle}
            customSuffix={customSuffix}
            onCustomSuffixChange={setCustomSuffix}
          />
        )}
        {steps[currentStep]?.id === 'subtitles' && (
          <StepSubtitles
            config={subtitleConfig}
            onConfigChange={setSubtitleConfig}
            imageStyle={imageStyle}
          />
        )}
        {steps[currentStep]?.id === 'audio' && (
          <StepAudio
            aiAudioMode={aiAudioMode}
            onChange={setAiAudioMode}
            voiceId={voiceId}
            onVoiceChange={setVoiceId}
            musicMood={musicMood}
            onMusicMoodChange={setMusicMood}
            musicVolume={musicVolume}
            onMusicVolumeChange={setMusicVolume}
          />
        )}
        {steps[currentStep]?.id === 'preview' && (
          <StepPreview
            videoId={videoId}
            videoUrl={videoUrl}
            thumbnailUrl={thumbnailUrl}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            generationStage={generationStage}
            selectedPlatforms={selectedPlatforms}
            onPlatformsChange={setSelectedPlatforms}
            scheduledAt={scheduledAt}
            onScheduledAtChange={setScheduledAt}
            connectedPlatforms={connectedPlatforms}
            onPublish={handlePublish}
            publishing={publishing}
          />
        )}
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--border)]">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 0 || isGenerating}
          >
            ← Back
          </Button>
          {(videoId || videoUrl) && currentStep === previewStepIndex && (
            <Button
              variant="secondary"
              onClick={handleClearDraft}
              disabled={isGenerating || publishing}
            >
              Start New Video
            </Button>
          )}
        </div>
        
        {currentStep < previewStepIndex && (
          <>
            <span className="text-[12px] text-[var(--text-dim)]">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
              loading={isGenerating}
            >
              {getCTALabel()}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export { CreateWizard }
