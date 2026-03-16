import { generateImage } from '@/lib/api/runware'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'
import { prisma } from '@/lib/db/prisma'
import { checkAndTriggerRender } from '@/lib/queue/workers/renderTrigger'
import type { ImageJob } from '@/lib/queue/videoQueue'
import axios from 'axios'

// ── Image Generation Handler ─────────────────────────

export async function handleImageJob(data: ImageJob) {
  const {
    videoId,
    userId,
    segmentIndex,
    imagePrompt,
    negativePrompt,
    seed,
    model,
    totalSegments,
  } = data

  console.log(
    `[imageWorker] Generating image for segment ${segmentIndex} of ${videoId}`
  )

  try {
    // 0. Idempotency Check: Prevent duplicate image generation on QStash retries
    const existing = await prisma.video.findUnique({
      where: { id: videoId },
      select: { imageUrls: true, status: true },
    })

    if (existing?.status === 'failed') {
      console.log(`[imageWorker] Video ${videoId} already failed. Skipping.`)
      return { success: true, skipped: true, reason: 'video_failed' }
    }

    const existingUrl = existing?.imageUrls?.[segmentIndex]
    if (existingUrl && existingUrl.length > 0) {
      console.log(`[imageWorker] Image for segment ${segmentIndex} of ${videoId} already exists. Skipping duplicate.`)
      await checkAndTriggerRender(videoId, userId)
      return { success: true, skipped: true, reason: 'idempotency_lock' }
    }
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

    // 4. Update video imageUrls array atomically using a row lock
    const updatedVideo = await prisma.$transaction(async (tx) => {
      // Lock the Video row to prevent concurrent workers from overwriting array updates
      await tx.$executeRaw`SELECT id FROM "Video" WHERE id = ${videoId} FOR UPDATE`

      const video = await tx.video.findUnique({
        where: { id: videoId },
        select: { imageUrls: true },
      })

      const currentUrls = video?.imageUrls ?? []
      const newUrls = [...currentUrls]
      while (newUrls.length <= segmentIndex) {
        newUrls.push('')
      }
      newUrls[segmentIndex] = gcsUrl

      return tx.video.update({
        where: { id: videoId },
        data: { imageUrls: newUrls },
        select: { imageUrls: true },
      })
    })

    // 5. Calculate and update progress
    const completedCount = updatedVideo.imageUrls.filter(
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

    // Mark video and renderJob as failed so the pipeline doesn't hang forever
    try {
      const failedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          errorMessage: `Image generation failed for segment ${segmentIndex}: ${message}`,
        },
      })
      await prisma.renderJob.update({
        where: { videoId },
        data: {
          status: 'failed',
          errorMessage: `Image segment ${segmentIndex} failed: ${message}`,
          completedAt: new Date(),
        },
      })

      // Refund credit for autopilot-generated videos
      if (failedVideo.topicQueueId) {
        const { addCredits } = await import('@/lib/utils/credits')
        await addCredits(
          failedVideo.userId,
          1,
          'refund',
          'Image generation failed — autopilot credit returned'
        ).catch((e) => console.error('[imageWorker] Credit refund failed:', e))
      }
    } catch (dbError) {
      console.error('[imageWorker] Failed to update failure status in DB:', dbError)
    }

    throw error
  }
}
