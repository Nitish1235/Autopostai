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

    throw error
  }
}
