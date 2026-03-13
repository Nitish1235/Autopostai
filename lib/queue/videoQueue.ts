// ── Video Queue — QStash Edition ──────────────────────
// Replaces the old BullMQ-based queue with Upstash QStash.
// All job publishing is done via HTTPS. No Redis connections.

import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'

// ── Job Type Interfaces ───────────────────────────────

export interface ScriptJob {
  videoId: string
  userId: string
  topic: string
  niche: string
  format: string
  segmentCount: number
  imageStyle: string
  voiceId: string
  voiceSpeed: number
  // FIX #3: If user pre-built & edited the script in the wizard, pass it here
  // so the worker skips OpenAI generation and uses this directly.
  prebuiltScript?: Array<{
    id: string
    order: number
    narration: string
    imagePrompt: string
    duration?: number
  }>
}

export interface ImageJob {
  videoId: string
  userId: string
  segmentIndex: number
  imagePrompt: string
  negativePrompt: string
  imageStyle: string
  seed: number
  model: string
  totalSegments: number
}

export interface VoiceJob {
  videoId: string
  userId: string
  segmentIndex: number
  narration: string
  voiceId: string
  voiceSpeed: number
  totalSegments: number
}

export interface RenderJob {
  videoId: string
  userId: string
  format: string
  subtitleConfig: Record<string, unknown>
  musicMood: string
  musicVolume: number
  script: Record<string, unknown>[]
  imageUrls: string[]
}

export interface PublishJob {
  videoId: string
  userId: string
  platforms: string[]
  scheduledAt?: string
}

export interface AiVideoJobData {
  videoId: string
  userId: string
  topic: string
  niche: string
  imageStyle: string
  format: string
  aiAudioMode: 'keep_ai' | 'replace'
  voiceId?: string
  voiceSpeed?: number
  musicMood?: string
  musicVolume?: number
  subtitleConfig?: Record<string, unknown>
}

// ── Queue Functions ──────────────────────────────────

export async function addVideoToQueue(
  videoId: string,
  userId: string,
  topic: string,
  niche: string,
  format: string,
  segmentCount: number,
  imageStyle: string,
  voiceId: string,
  voiceSpeed: number,
  // FIX #3: pass user-edited script to avoid re-generating via OpenAI
  prebuiltScript?: ScriptJob['prebuiltScript']
): Promise<void> {
  const jobData: ScriptJob = {
    videoId,
    userId,
    topic,
    niche,
    format,
    segmentCount,
    imageStyle,
    voiceId,
    voiceSpeed,
    prebuiltScript,
  }

  // Publish to worker's /jobs/script endpoint via QStash
  await enqueueJob('/jobs/script', jobData as unknown as Record<string, unknown>, {
    deduplicationId: `script-${videoId}`,
  })

  // Create RenderJob record in DB
  await prisma.renderJob.upsert({
    where: { videoId },
    create: {
      videoId,
      status: 'queued',
      stage: 'script',
      progress: 0,
    },
    update: {
      status: 'queued',
      stage: 'script',
      progress: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  })

  // Update video status
  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: 'generating_script',
      renderJobId: videoId,
    },
  })
}

export async function getJobStatus(
  videoId: string
): Promise<{ stage: string; progress: number }> {
  const renderJob = await prisma.renderJob.findUnique({
    where: { videoId },
  })

  if (!renderJob) {
    return { stage: 'unknown', progress: 0 }
  }

  return {
    stage: renderJob.stage ?? 'unknown',
    progress: renderJob.progress,
  }
}

export async function addAiVideoToQueue(
  videoId: string,
  jobData: AiVideoJobData
): Promise<void> {
  // Publish to worker's /jobs/ai-video endpoint via QStash
  await enqueueJob('/jobs/ai-video', jobData as unknown as Record<string, unknown>, {
    deduplicationId: `ai-video-${videoId}`,
  })

  // Create RenderJob record in DB
  await prisma.renderJob.upsert({
    where: { videoId },
    create: {
      videoId,
      status: 'queued',
      stage: 'ai_generate',
      progress: 0,
    },
    update: {
      status: 'queued',
      stage: 'ai_generate',
      progress: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  })

  // Update video status
  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: 'generating_script',
      renderJobId: videoId,
    },
  })
}
