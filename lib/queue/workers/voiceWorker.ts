import { generateVoiceAndUpload } from '@/lib/api/unrealSpeech'
import { prisma } from '@/lib/db/prisma'
import { checkAndTriggerRender } from '@/lib/queue/workers/renderTrigger'
import type { VoiceJob } from '@/lib/queue/videoQueue'

// ── Voice Generation Handler ─────────────────────────

export async function handleVoiceJob(data: VoiceJob) {
  const {
    videoId,
    userId,
    narration,
    voiceId,
    voiceSpeed,
  } = data

  console.log(
    `[voiceWorker] Generating master voice track for ${videoId}`
  )

  try {
    // 1. Generate voice and upload to GCS (master track)
    const result = await generateVoiceAndUpload({
      text: narration,
      voiceId,
      speed: voiceSpeed,
      userId,
      videoId,
    })

    // 2. Update Video with master audio details
    await prisma.video.update({
      where: { id: videoId },
      data: {
        masterAudioUrl: result.gcsUrl,
        masterWordTimestamps: result.words as any,
      },
    })

    console.log(
      `[voiceWorker] Master voice done for ${videoId}`
    )

    // 3. Check if all assets ready to trigger render
    await checkAndTriggerRender(videoId, userId)

    return {
      success: true,
      gcsUrl: result.gcsUrl,
      duration: result.duration,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'

    console.error(
      `[voiceWorker] Master voice generation failed for ${videoId}: ${message}`
    )

    // Try to mark the video processing as failed
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          errorMessage: message,
          status: 'failed',
        },
      })
      await prisma.renderJob.update({
        where: { videoId },
        data: {
          errorMessage: message,
          status: 'failed',
          completedAt: new Date(),
        },
      })
    } catch {
      // Non-critical
    }

    throw error
  }
}
