import { generateVoiceAndUpload } from '@/lib/api/unrealSpeech'
import { prisma } from '@/lib/db/prisma'
import { checkAndTriggerRender } from '@/lib/queue/workers/renderTrigger'
import type { VoiceJob } from '@/lib/queue/videoQueue'
import type { ScriptSegment } from '@/types'

// ── Voice Generation Handler ─────────────────────────

export async function handleVoiceJob(data: VoiceJob) {
  const {
    videoId,
    userId,
    segmentIndex,
    narration,
    voiceId,
    voiceSpeed,
    totalSegments,
  } = data

  console.log(
    `[voiceWorker] Generating voice for segment ${segmentIndex} of ${videoId}`
  )

  try {
    // 1. Generate voice and upload to GCS
    const result = await generateVoiceAndUpload({
      text: narration,
      voiceId,
      speed: voiceSpeed,
      userId,
      videoId,
      segmentIndex,
    })

    // 2. Update segment in Video.script JSON
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { script: true },
    })

    if (!video?.script) {
      throw new Error(`Video script not found for ${videoId}`)
    }

    const script = video.script as unknown as ScriptSegment[]
    const updatedScript = script.map((seg, idx) => {
      if (idx === segmentIndex) {
        return {
          ...seg,
          audioUrl: result.gcsUrl,
          wordTimestamps: result.words,
          duration: result.duration,
        }
      }
      return seg
    })

    await prisma.video.update({
      where: { id: videoId },
      data: {
        script: updatedScript as any,
      },
    })

    // 3. Log progress
    const completedVoice = updatedScript.filter(
      (seg) => !!seg.audioUrl && seg.audioUrl.length > 0
    ).length

    console.log(
      `[voiceWorker] Voice ${segmentIndex} done for ${videoId} (${completedVoice}/${totalSegments})`
    )

    // 4. Check if all assets ready to trigger render
    await checkAndTriggerRender(videoId, userId)

    return {
      success: true,
      gcsUrl: result.gcsUrl,
      segmentIndex,
      duration: result.duration,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'

    console.error(
      `[voiceWorker] Voice generation failed for segment ${segmentIndex} of ${videoId}: ${message}`
    )

    // Try to mark the segment as failed in script JSON
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { script: true },
      })

      if (video?.script) {
        const script = video.script as unknown as ScriptSegment[]
        const updatedScript = script.map((seg, idx) => {
          if (idx === segmentIndex) {
            return { ...seg, audioUrl: '', error: message }
          }
          return seg
        })

        await prisma.video.update({
          where: { id: videoId },
          data: {
            script: updatedScript as any,
          },
        })
      }
    } catch {
      // Non-critical
    }

    throw error
  }
}
