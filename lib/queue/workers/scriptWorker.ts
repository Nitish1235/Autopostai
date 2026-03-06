import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { generateScript } from '@/lib/api/openai'
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { imageQueue, voiceQueue } from '@/lib/queue/videoQueue'
import {
  buildImagePrompt,
  NEGATIVE_PROMPT,
  STYLE_NEGATIVES,
} from '@/lib/prompts/imagePrompt'
import { getModelForStyle } from '@/lib/api/runware'
import type { ScriptJob, ImageJob, VoiceJob } from '@/lib/queue/videoQueue'

// ── Redis Connection ─────────────────────────────────
const connection = new Redis(process.env.REDIS_URL ?? '', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// ── Script Generation Worker ─────────────────────────

export const scriptWorker = new Worker<ScriptJob>(
  'script-generation',
  async (job: Job<ScriptJob>) => {
    const {
      videoId,
      userId,
      topic,
      niche,
      format,
      imageStyle,
      voiceId,
      voiceSpeed,
    } = job.data

    console.log(`[scriptWorker] Starting script generation for ${videoId}`)

    try {
      // 1. Update status
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'generating_script' },
      })
      await prisma.renderJob.update({
        where: { videoId },
        data: { stage: 'script', progress: 5, startedAt: new Date() },
      })

      // 2. Generate script via GPT-4o
      const result = await generateScript({ topic, niche, format })

      // 3. Update video with script
      await prisma.video.update({
        where: { id: videoId },
        data: {
          title: result.title,
          script: result.segments as any,
          status: 'generating_images',
          imageUrls: new Array(result.segments.length).fill(''),
        },
      })

      // 4. Update render progress
      await prisma.renderJob.update({
        where: { videoId },
        data: { stage: 'images', progress: 20 },
      })

      // 5. Generate shared seed for visual consistency
      const seed = Math.floor(Math.random() * 2147483647)

      // 6. Queue image generation jobs
      for (let index = 0; index < result.segments.length; index++) {
        const segment = result.segments[index]

        const fullPositivePrompt = buildImagePrompt(
          segment.imagePrompt,
          imageStyle,
          seed + index
        )

        const styleNegative = STYLE_NEGATIVES[imageStyle] ?? ''
        const fullNegativePrompt = styleNegative
          ? `${NEGATIVE_PROMPT}, ${styleNegative}`
          : NEGATIVE_PROMPT

        const imageJobData: ImageJob = {
          videoId,
          userId,
          segmentIndex: index,
          imagePrompt: fullPositivePrompt,
          negativePrompt: fullNegativePrompt,
          imageStyle,
          seed: seed + index,
          model: getModelForStyle(imageStyle),
          totalSegments: result.segments.length,
        }

        await imageQueue.add(
          `image-${videoId}-${index}`,
          imageJobData,
          { jobId: `image-${videoId}-${index}` }
        )
      }

      // 7. Queue voice generation jobs in parallel
      for (let index = 0; index < result.segments.length; index++) {
        const segment = result.segments[index]

        const voiceJobData: VoiceJob = {
          videoId,
          userId,
          segmentIndex: index,
          narration: segment.narration,
          voiceId,
          voiceSpeed,
          totalSegments: result.segments.length,
        }

        await voiceQueue.add(
          `voice-${videoId}-${index}`,
          voiceJobData,
          { jobId: `voice-${videoId}-${index}` }
        )
      }

      console.log(
        `[scriptWorker] Script done. Queued ${result.segments.length} image jobs and ${result.segments.length} voice jobs.`
      )

      return { success: true, segmentCount: result.segments.length }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'

      console.error(
        `[scriptWorker] Failed for video ${videoId}: ${message}`
      )

      // Update video and render job to failed
      const failedVideo = await prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed', errorMessage: message },
      })
      await prisma.renderJob.update({
        where: { videoId },
        data: { status: 'failed', errorMessage: message },
      })

      // BUG FIX #10: Refund credit for autopilot-generated videos
      if (failedVideo.topicQueueId) {
        await addCredits(
          failedVideo.userId,
          1,
          'refund',
          'Script generation failed — autopilot credit returned'
        ).catch((e) => console.error('[scriptWorker] Credit refund failed:', e))
      }

      throw error
    }
  },
  {
    connection,
    concurrency: 1,
  }
)

scriptWorker.on('failed', (job, error) => {
  console.error(
    `[scriptWorker] Job ${job?.id} failed:`,
    error.message
  )
})

scriptWorker.on('completed', (job) => {
  console.log(`[scriptWorker] Job ${job.id} completed`)
})
