import { generateScript } from '@/lib/api/openai'
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { enqueueJob } from '@/lib/queue/qstash'
import { 
  buildImagePrompt,
  NEGATIVE_PROMPT,
  STYLE_NEGATIVES,
} from '@/lib/prompts/imagePrompt'
import { getModelForStyle, generateImageBatch } from '@/lib/api/runware'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'
import axios from 'axios'
import type { ScriptJob, VoiceJob } from '@/lib/queue/videoQueue'

// ── Script Generation Handler ────────────────────────

export async function handleScriptJob(data: ScriptJob) {
  const {
    videoId,
    userId,
    topic,
    niche,
    format,
    imageStyle,
    voiceId,
    voiceSpeed,
    prebuiltScript,
  } = data

  console.log(`[scriptWorker] Starting script generation for ${videoId}`)

  try {
    // 0. Idempotency Check: Prevent double-execution on QStash retries
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { status: true },
    })

    if (!existingVideo) {
      throw new Error(`Video not found: ${videoId}`)
    }

    if (existingVideo.status !== 'pending' && existingVideo.status !== 'generating_script') {
       console.log(`[scriptWorker] Job already processed. Current status: ${existingVideo.status}. Skipping.`)
       return { success: true, skipped: true, reason: 'idempotency_lock' }
    }
    // 1. Update status
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'generating_script' },
    })
    await prisma.renderJob.update({
      where: { videoId },
      data: { stage: 'script', progress: 5, startedAt: new Date() },
    })

    // 2. Use prebuilt script from wizard if provided, otherwise generate via GPT-4o
    let scriptSegments: Array<{
      id: string
      order: number
      narration: string
      imagePrompt: string
      estimatedDuration?: number
    }>
    let title: string

    if (prebuiltScript && prebuiltScript.length > 0) {
      console.log(`[scriptWorker] Using prebuilt script (${prebuiltScript.length} segments) for ${videoId}`)
      scriptSegments = prebuiltScript.map((seg, i) => ({
        id: seg.id ?? `seg_${String(i + 1).padStart(3, '0')}`,
        order: seg.order ?? i + 1,
        narration: seg.narration,
        imagePrompt: seg.imagePrompt,
        estimatedDuration: seg.duration ?? 3.5,
      }))
      title = topic.slice(0, 60)
    } else {
      console.log(`[scriptWorker] Generating script via OpenAI for ${videoId}`)
      const result = await generateScript({ topic, niche, format })
      scriptSegments = result.segments
      title = result.title
    }

    // 3. Update video with script
    await prisma.video.update({
      where: { id: videoId },
      data: {
        title,
        script: scriptSegments as any,
        status: 'generating_images',
        imageUrls: new Array(scriptSegments.length).fill(''),
      },
    })

    // 4. Update render progress
    await prisma.renderJob.update({
      where: { videoId },
      data: { stage: 'images', progress: 20 },
    })

    // 5. Generate shared seed for visual consistency
    const seed = Math.floor(Math.random() * 2147483647)

    // 6. Generate ALL images concurrently using Runware Batch API
    console.log(`[scriptWorker] Generating ${scriptSegments.length} images concurrently for ${videoId}`)
    
    // Prepare batch prompt objects
    const styleNegative = STYLE_NEGATIVES[imageStyle] ?? ''
    const fullNegativePrompt = styleNegative
      ? `${NEGATIVE_PROMPT}, ${styleNegative}`
      : NEGATIVE_PROMPT

    const batchPrompts = scriptSegments.map((segment, index) => ({
      positivePrompt: buildImagePrompt(segment.imagePrompt, imageStyle, seed + index),
      negativePrompt: fullNegativePrompt,
      seed: seed + index,
    }))

    // Execute batch generation
    let imageResults: Array<{ index: number; imageUrl: string }> = []
    try {
      imageResults = await generateImageBatch({
        prompts: batchPrompts,
        model: getModelForStyle(imageStyle),
        width: 1024,
        height: 1792,
      })
    } catch (batchErr) {
      console.error(`[scriptWorker] generateImageBatch failed:`, batchErr)
      throw new Error(`Failed to generate images in batch: ${batchErr}`)
    }

    // Download and upload to GCS concurrently
    console.log(`[scriptWorker] Uploading ${imageResults.length} generated images to GCS`)
    const uploadPromises = imageResults.map(async (res) => {
      try {
        const response = await axios.get(res.imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        })
        const imageBuffer = Buffer.from(response.data)
        const gcsKey = generateSegmentKey(userId, videoId, 'image', res.index, 'webp')
        const gcsUrl = await uploadBuffer(imageBuffer, gcsKey, 'image/webp')
        return { index: res.index, gcsUrl }
      } catch (uploadErr) {
        console.error(`[scriptWorker] Failed to upload image ${res.index}:`, uploadErr)
        throw uploadErr
      }
    })

    const finalUploads = await Promise.all(uploadPromises)
    
    // Create an ordered array of URLs
    const finalUrls = new Array(scriptSegments.length).fill('')
    finalUploads.forEach((upload) => {
      finalUrls[upload.index] = upload.gcsUrl
    })

    // Update video with final image URLs
    await prisma.video.update({
      where: { id: videoId },
      data: { imageUrls: finalUrls },
    })

    // Update render progress
    await prisma.renderJob.update({
      where: { videoId },
      data: { progress: 55 },
    })

    // 7. Queue voice generation job via QStash
    // We queue voice rendering to handle ElevenLabs latency
    const masterNarration = scriptSegments.map((s) => s.narration).join(' ')

    const voiceJobData: VoiceJob = {
      videoId,
      userId,
      narration: masterNarration,
      voiceId,
      voiceSpeed,
      totalSegments: scriptSegments.length,
    }

    await enqueueJob('/api/jobs/voice', voiceJobData as unknown as Record<string, unknown>, {
      deduplicationId: `voice-${videoId}-master`,
    })

    console.log(
      `[scriptWorker] Script and Images done. Queued 1 master voice job.`
    )

    return { success: true, segmentCount: scriptSegments.length, imagesGenerated: finalUploads.length }
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

    // Refund credit for autopilot-generated videos
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
}
