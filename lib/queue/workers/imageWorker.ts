import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { generateImage } from '@/lib/api/runware'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'
import { prisma } from '@/lib/db/prisma'
import { checkAndTriggerRender } from '@/lib/queue/workers/renderTrigger'
import type { ImageJob } from '@/lib/queue/videoQueue'
import axios from 'axios'

// ── Redis Connection ─────────────────────────────────
const connection = new Redis(process.env.REDIS_URL ?? 'redis://dummy:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (!process.env.REDIS_URL) return null;
    return Math.min(times * 50, 2000);
  },
  enableReadyCheck: false,
})

// ── Image Generation Worker ──────────────────────────

export const imageWorker = new Worker<ImageJob>(
  'image-generation',
  async (job: Job<ImageJob>) => {
    const {
      videoId,
      userId,
      segmentIndex,
      imagePrompt,
      negativePrompt,
      seed,
      model,
      totalSegments,
    } = job.data

    console.log(
      `[imageWorker] Generating image for segment ${segmentIndex} of ${videoId}`
    )

    try {
      // 1. Generate image via Runware
      const result = await generateImage({
        positivePrompt: imagePrompt,
        negativePrompt,
        width: 1024,
        height: 1792,
        seed,
        model,
      })

      // 2. Download image from returned URL
      const response = await axios.get(result.imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })
      const imageBuffer = Buffer.from(response.data)

      // 3. Generate GCS key and upload
      const gcsKey = generateSegmentKey(
        userId,
        videoId,
        'image',
        segmentIndex,
        'webp'
      )
      const gcsUrl = await uploadBuffer(imageBuffer, gcsKey, 'image/webp')

      // 4. Update video imageUrls array at correct index
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { imageUrls: true },
      })

      const currentUrls = video?.imageUrls ?? []
      // Ensure array is long enough
      const newUrls = [...currentUrls]
      while (newUrls.length <= segmentIndex) {
        newUrls.push('')
      }
      newUrls[segmentIndex] = gcsUrl

      await prisma.video.update({
        where: { id: videoId },
        data: { imageUrls: newUrls },
      })

      // 5. Calculate and update progress
      const completedCount = newUrls.filter(
        (url) => !!url && url.length > 0
      ).length
      const progress = Math.round(20 + (completedCount / totalSegments) * 35)

      await prisma.renderJob.update({
        where: { videoId },
        data: { progress },
      })

      // 6. Check if all assets ready to trigger render
      await checkAndTriggerRender(videoId, userId)

      console.log(
        `[imageWorker] Image ${segmentIndex} done for ${videoId} (${completedCount}/${totalSegments})`
      )

      return { success: true, gcsUrl, segmentIndex }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'

      console.error(
        `[imageWorker] Image generation failed for segment ${segmentIndex} of ${videoId}: ${message}`
      )

      // Don't fail the entire video for a single image failure
      // The retry mechanism in BullMQ will handle retries
      throw error
    }
  },
  {
    connection,
    concurrency: 3,
  }
)

imageWorker.on('failed', (job, error) => {
  console.error(
    `[imageWorker] Job ${job?.id} failed:`,
    error.message
  )
})

imageWorker.on('completed', (job) => {
  console.log(`[imageWorker] Job ${job.id} completed`)
})
