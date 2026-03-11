import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { generateVoiceAndUpload } from '@/lib/api/unrealSpeech'
import { prisma } from '@/lib/db/prisma'
import { checkAndTriggerRender } from '@/lib/queue/workers/renderTrigger'
import { REDIS_OPTIONS } from '@/lib/queue/videoQueue'
import type { VoiceJob } from '@/lib/queue/videoQueue'
import type { ScriptSegment } from '@/types'

// ── Redis Connection ─────────────────────────────────
const connection = new Redis(process.env.REDIS_URL ?? 'redis://dummy:6379', REDIS_OPTIONS)

// ── Voice Generation Worker ──────────────────────────

export const voiceWorker = new Worker<VoiceJob>(
  'voice-generation',
  async (job: Job<VoiceJob>) => {
    const {
      videoId,
      userId,
      segmentIndex,
      narration,
      voiceId,
      voiceSpeed,
      totalSegments,
    } = job.data

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

      // 3. Calculate voice progress
      const completedVoice = updatedScript.filter(
        (seg) => !!seg.audioUrl && seg.audioUrl.length > 0
      ).length

      // Voice contributes up to 25% of total render progress (from 20% to 45%)
      // But images also contribute, so we don't update progress here
      // The renderTrigger will handle final progress
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
        // Non-critical: if we can't mark it, that's okay
      }

      throw error
    }
  },
  {
    connection,
    concurrency: 2,
  }
)

voiceWorker.on('failed', (job, error) => {
  console.error(
    `[voiceWorker] Job ${job?.id} failed:`,
    error.message
  )
})

voiceWorker.on('completed', (job) => {
  console.log(`[voiceWorker] Job ${job.id} completed`)
})
