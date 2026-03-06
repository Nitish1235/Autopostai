import { prisma } from '@/lib/db/prisma'
import { renderQueue } from '@/lib/queue/videoQueue'
import type { ScriptSegment } from '@/types'

// ── Check and Trigger Render ─────────────────────────
// Shared between imageWorker and voiceWorker.
// Called after each image or voice segment completes.
// When all assets are ready, triggers the render job.

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

  // 4. Count completed voice segments (segments with audioUrl set)
  const completedVoice = script.filter(
    (seg) => !!seg.audioUrl && seg.audioUrl.length > 0
  ).length

  const allImagesReady = completedImages === totalExpected
  const allVoiceReady = completedVoice === totalExpected

  // 5. If not all ready, log progress and return
  if (!allImagesReady || !allVoiceReady) {
    console.log(
      `[renderTrigger] Waiting... images: ${completedImages}/${totalExpected}, voice: ${completedVoice}/${totalExpected}`
    )
    return
  }

  // 6. Check if already rendering or beyond
  const renderStatuses = ['rendering', 'ready', 'scheduled', 'posted']
  if (renderStatuses.includes(video.status)) {
    console.log(
      `[renderTrigger] Video ${videoId} already in status: ${video.status}. Skipping.`
    )
    return
  }

  // 7. Trigger render
  console.log(
    `[renderTrigger] All assets ready. Render job added for ${videoId}`
  )

  // Update video status
  await prisma.video.update({
    where: { id: videoId },
    data: { status: 'rendering' },
  })

  // Update RenderJob record
  await prisma.renderJob.update({
    where: { videoId },
    data: {
      stage: 'render',
      progress: 58,
      startedAt: new Date(),
    },
  })

  // Add job to render queue
  await renderQueue.add(
    `render-${videoId}`,
    {
      videoId,
      userId,
      format: video.format,
      subtitleConfig: video.subtitleConfig as Record<string, unknown>,
      musicMood: video.musicMood,
      musicVolume: video.musicVolume,
      script: script as unknown as Record<string, unknown>[],
      imageUrls: video.imageUrls,
    },
    {
      jobId: `render-${videoId}`,
    }
  )
}
