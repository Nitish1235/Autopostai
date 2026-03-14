import { generateScript } from '@/lib/api/openai'
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { enqueueJob } from '@/lib/queue/qstash'
import {
  buildImagePrompt,
  NEGATIVE_PROMPT,
  STYLE_NEGATIVES,
} from '@/lib/prompts/imagePrompt'
import { getModelForStyle } from '@/lib/api/runware'
import type { ScriptJob, ImageJob, VoiceJob } from '@/lib/queue/videoQueue'

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

    // 6. Queue image generation jobs via QStash
    for (let index = 0; index < scriptSegments.length; index++) {
      const segment = scriptSegments[index]

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
        totalSegments: scriptSegments.length,
      }

      await enqueueJob('/api/jobs/image', imageJobData as unknown as Record<string, unknown>, {
        deduplicationId: `image-${videoId}-${index}`,
        delay: index * 2, // stagger by 2 seconds per segment to avoid Runware timeouts
      })
    }

    // 7. Queue voice generation jobs via QStash
    for (let index = 0; index < scriptSegments.length; index++) {
      const segment = scriptSegments[index]

      const voiceJobData: VoiceJob = {
        videoId,
        userId,
        segmentIndex: index,
        narration: segment.narration,
        voiceId,
        voiceSpeed,
        totalSegments: scriptSegments.length,
      }

      await enqueueJob('/api/jobs/voice', voiceJobData as unknown as Record<string, unknown>, {
        deduplicationId: `voice-${videoId}-${index}`,
        delay: index * 3, // stagger by 3 seconds per segment to avoid UnrealSpeech 429 rate limits
      })
    }

    console.log(
      `[scriptWorker] Script done. Queued ${scriptSegments.length} image + voice jobs.`
    )

    return { success: true, segmentCount: scriptSegments.length }
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
