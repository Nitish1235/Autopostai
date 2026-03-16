import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'
import type { ScriptSegment } from '@/types'

// ── Check and Trigger Render ─────────────────────────
// Shared between imageWorker and voiceWorker.
// Called after each image or voice segment completes.
// When all assets are ready, triggers the render job via QStash.

export async function checkAndTriggerRender(
  videoId: string,
  userId: string
): Promise<void> {
  // 1. Fetch video with all relevant fields
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      status: true,
      format: true,
      script: true,
      imageUrls: true,
      masterAudioUrl: true,
      masterWordTimestamps: true,
      subtitleConfig: true,
      musicMood: true,
      musicVolume: true,
    },
  })

  if (!video) {
    console.error(`[renderTrigger] Video not found: ${videoId}`)
    return
  }

  // 2. Parse script segments
  const script = video.script as unknown as ScriptSegment[] | null
  if (!script || !Array.isArray(script) || script.length === 0) {
    console.log(`[renderTrigger] No script found for video ${videoId}`)
    return
  }

  const totalExpected = script.length

  // 3. Count completed images
  const completedImages = (video.imageUrls ?? []).filter(
    (url) => !!url && url.length > 0
  ).length

  // 4. Check completed master voice
  const allVoiceReady = !!video.masterAudioUrl
  const allImagesReady = completedImages === totalExpected

  // 5. If not all ready, log progress and return
  if (!allImagesReady || !allVoiceReady) {
    console.log(
      `[renderTrigger] Waiting... images: ${completedImages}/${totalExpected}, voice: ${allVoiceReady ? 'ready' : 'pending'}`
    )
    return
  }

  // 6. Atomically claim the render slot — prevents TOCTOU race condition
  //    If two workers call this simultaneously, only one updateMany will match
  const claimResult = await prisma.video.updateMany({
    where: {
      id: videoId,
      status: { notIn: ['rendering', 'ready', 'scheduled', 'posted', 'failed'] },
    },
    data: { status: 'rendering' },
  })

  if (claimResult.count === 0) {
    console.log(
      `[renderTrigger] Video ${videoId} already claimed for rendering or beyond. Skipping.`
    )
    return
  }

  // 7. Trigger render via QStash
  console.log(
    `[renderTrigger] All assets ready. Queuing render for ${videoId}`
  )

  // Update RenderJob record
  await prisma.renderJob.update({
    where: { videoId },
    data: {
      stage: 'render',
      progress: 58,
      startedAt: new Date(),
    },
  })

  // Enqueue render job via QStash
  await enqueueJob('/api/jobs/render', {
    videoId,
    userId,
    format: video.format,
    subtitleConfig: video.subtitleConfig as Record<string, unknown>,
    musicMood: video.musicMood,
    musicVolume: video.musicVolume,
    script: script as unknown as Record<string, unknown>[],
    imageUrls: video.imageUrls,
    masterAudioUrl: video.masterAudioUrl as string,
    masterWordTimestamps: video.masterWordTimestamps as Record<string, unknown>[],
  }, {
    deduplicationId: `render-${videoId}`,
  })
}
