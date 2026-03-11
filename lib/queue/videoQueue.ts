import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@/lib/db/prisma'

import { Redis as UpstashRedis } from '@upstash/redis'

// ── Environment Detection ─────────────────────────────
// The Web App and the Background Worker use different mechanisms 
// for connecting to Upstash to bypass Serverless VPC port blocks.

const isWorker = process.env.IS_WORKER === 'true'

// ── Redis Connection (Worker Only) ────────────────────
// Only Workers establish the heavy TCP socket connection on port 6379. 
// Web containers will use Upstash HTTP API to enqueue jobs via HTTPS.
const connection = isWorker 
  ? new Redis(process.env.REDIS_URL ?? 'redis://dummy:6379', {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (!process.env.REDIS_URL) return null;
        return Math.min(times * 100, 3000); 
      },
      enableReadyCheck: false,
      family: 0,
      connectTimeout: 20000,
      commandTimeout: 15000,
      keepAlive: 10000,
      lazyConnect: false,
      tls: process.env.REDIS_URL?.includes('rediss://') ? { rejectUnauthorized: false } : undefined,
    })
  : new Redis('redis://dummy:6379', { lazyConnect: true }) // Dummy connection for Web so BullMQ objects construct safely

// ── Upstash HTTP Client (Web Only) ────────────────────
const upstash = new UpstashRedis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ── Queues ────────────────────────────────────────────

// We must NEVER instantiate a real BullMQ Queue in the Web container,
// otherwise BullMQ automatically attempts to execute Redis scripts on startup
// and crashes Cloud Run instances via ETIMEDOUT / EPIPE networking blocks.
// Instead, we export dummy Queue objects for the Web that just drop jobs into Upstash REST.

export const scriptQueue = isWorker ? new Queue('script-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

export const imageQueue = isWorker ? new Queue('image-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

export const voiceQueue = isWorker ? new Queue('voice-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

export const renderQueue = isWorker ? new Queue('video-render', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

export const publishQueue = isWorker ? new Queue('publish', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

export const aiVideoQueue = isWorker ? new Queue('ai-video-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
}) : { add: () => {} } as unknown as Queue

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

// ── Helper API Functions ──────────────────────────────

/**
 * BullMQ expects jobs to be added via Lua scripts to handle complex state. 
 * Since Serverless Cloud Run VPC blocks native TCP (port 6379), we use 
 * Upstash REST via HTTP to push basic jobs to the 'Wait' queue.
 */
async function submitJobViaREST(queueName: string, jobId: string, data: any) {
  const timestamp = Date.now()
  const jobKey = `bull:${queueName}:${jobId}`
  
  // 1. Create the BullMQ Job Hash
  await upstash.hset(jobKey, {
    name: jobId,
    data: JSON.stringify(data),
    opts: JSON.stringify({ jobId, attempts: 3, delay: 0 }),
    timestamp,
    delay: 0,
    priority: 0,
  })

  // 2. Push to the Wait list
  await upstash.rpush(`bull:${queueName}:wait`, jobId)
  
  // 3. Emit the waiting event for workers to pick it up
  await upstash.publish(`bull:${queueName}:events`, JSON.stringify({
    event: 'waiting',
    jobId,
  }))
}

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

  if (isWorker) {
    await scriptQueue.add(`script-${videoId}`, jobData, {
      jobId: `script-${videoId}`,
    })
  } else {
    // Web app safely pushes state via HTTPS REST
    await submitJobViaREST('script-generation', `script-${videoId}`, jobData)
  }

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
  if (isWorker) {
    await aiVideoQueue.add(`ai-video-${videoId}`, jobData, {
      jobId: `ai-video-${videoId}`,
    })
  } else {
    await submitJobViaREST('ai-video-generation', `ai-video-${videoId}`, jobData)
  }

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
