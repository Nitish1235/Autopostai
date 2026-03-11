import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@/lib/db/prisma'

// ── Redis Connection ──────────────────────────────────
const connection = new Redis(process.env.REDIS_URL ?? 'redis://dummy:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (!process.env.REDIS_URL) return null;
    return Math.min(times * 50, 2000);
  },
  enableReadyCheck: false,
  family: 0,
  tls: process.env.REDIS_URL?.includes('rediss://') ? { rejectUnauthorized: false } : undefined,
})

// ── Queues ────────────────────────────────────────────

export const scriptQueue = new Queue('script-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const imageQueue = new Queue('image-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const voiceQueue = new Queue('voice-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const renderQueue = new Queue('video-render', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
})

export const publishQueue = new Queue('publish', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const aiVideoQueue = new Queue('ai-video-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
})

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

// ── Helper Functions ──────────────────────────────────

export async function addVideoToQueue(
  videoId: string,
  userId: string,
  topic: string,
  niche: string,
  format: string,
  segmentCount: number,
  imageStyle: string,
  voiceId: string,
  voiceSpeed: number
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
  }

  await scriptQueue.add(`script-${videoId}`, jobData, {
    jobId: `script-${videoId}`,
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
  await aiVideoQueue.add(`ai-video-${videoId}`, jobData, {
    jobId: `ai-video-${videoId}`,
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
      status: 'generating_script', // reuse existing status for initial phase
      renderJobId: videoId,
    },
  })
}
