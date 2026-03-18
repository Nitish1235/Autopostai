import { renderVideo } from '@/lib/ffmpeg/buildCommand'
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { addAiVideoCredits } from '@/lib/utils/aiVideoCredits'
import { enqueueJob } from '@/lib/queue/qstash'
import { inngest } from '@/lib/inngest/client'
import type { RenderJob, PublishJob } from '@/lib/queue/videoQueue'
import type { ScriptSegment, SubtitleConfig } from '@/types'

// ── Render Handler ───────────────────────────────────

export async function handleRenderJob(data: RenderJob) {
  const { videoId, userId } = data
  const startTime = Date.now()

  console.log(`[renderWorker] Starting render for videoId: ${videoId}`)

  try {
    // 1. Fetch full video from DB
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        format: true,
        imageStyle: true,
        script: true,
        imageUrls: true,
        subtitleConfig: true,
        masterAudioUrl: true,
        masterWordTimestamps: true,
        musicMood: true,
        musicVolume: true,
        platforms: true,
        scheduledAt: true,
        generationMode: true,
      },
    })

    if (!video) {
      throw new Error(`Video not found: ${videoId}`)
    }

    // ... (rest of the steps remain the same until catch block)
    // 1.5 Idempotency Check: If video is already done, skip
    if (video.status === 'ready' || video.status === 'posted' || video.videoUrl) {
       console.log(`[renderWorker] Video ${videoId} is already rendered (status: ${video.status}). Skipping duplicate job.`)
       return { success: true, skipped: true, reason: 'idempotency_lock' }
    }

    // 2. Parse script
    const script = video.script as unknown as ScriptSegment[]
    if (!script || !Array.isArray(script) || script.length === 0) {
      throw new Error('Video script is empty or invalid')
    }

    // 3. Validate all required assets
    const imageCount = (video.imageUrls ?? []).filter(
      (url) => !!url && url.length > 0
    ).length

    if (imageCount !== script.length) {
      throw new Error(
        `Video assets incomplete: images ${imageCount}/${script.length}`
      )
    }
    if (!video.masterAudioUrl) {
      throw new Error('Video assets incomplete: master audio not found')
    }

    // 4. Atomically claim the renderJob — prevents duplicate FFmpeg on QStash retries
    //    Only the first request will match status='queued', retries see 'processing' and get count=0
    const claimResult = await prisma.renderJob.updateMany({
      where: { videoId, status: { in: ['queued', 'render'] } },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    })

    if (claimResult.count === 0) {
      console.log(`[renderWorker] RenderJob for ${videoId} already claimed (processing/completed). Skipping duplicate.`)
      return { success: true, skipped: true, reason: 'idempotency_lock' }
    }

    // 5. Execute render
    const result = await renderVideo({
      videoId,
      userId,
      imageUrls: video.imageUrls,
      script,
      subtitleConfig: video.subtitleConfig as unknown as SubtitleConfig,
      musicMood: video.musicMood,
      musicVolume: video.musicVolume,
      format: video.format,
      imageStyle: video.imageStyle,
      masterAudioUrl: video.masterAudioUrl === 'skipped' ? '' : (video.masterAudioUrl ?? ''),
      masterWordTimestamps: video.masterWordTimestamps as any[],
    })

    const elapsed = Date.now() - startTime
    console.log(
      `[renderWorker] Render complete for ${videoId} in ${elapsed}ms`
    )

    // 6. Send Inngest event
    try {
      await inngest.send({
        name: 'video/ready',
        data: { videoId, userId },
      })
    } catch {
      // Non-critical
    }

    // 7. Check if we should publish immediately
    const shouldPublishNow =
      video.platforms.length > 0 &&
      (!video.scheduledAt || new Date(video.scheduledAt) <= new Date())

    if (shouldPublishNow) {
      const publishData: PublishJob = {
        videoId,
        userId,
        platforms: video.platforms,
      }
      await enqueueJob('/api/jobs/publish', publishData as unknown as Record<string, unknown>, {
        deduplicationId: `publish-${videoId}`,
      })
      console.log(
        `[renderWorker] Queued publish job for ${videoId}`
      )
    }

    return {
      success: true,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      elapsed,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown render error'

    console.error(
      `[renderWorker] Failed for video ${videoId}: ${message}`
    )

    // Update video and render job to failed
    const failedVideo = await prisma.video.update({
      where: { id: videoId },
      data: { status: 'failed', errorMessage: message },
    })

    await prisma.renderJob.update({
      where: { videoId },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    })

    // Refund credit for any failed video (manual or autopilot)
    if (failedVideo.generationMode === 'ai_video') {
      await addAiVideoCredits(
        failedVideo.userId,
        1,
        'refund',
        'Video render failed — AI credit returned'
      ).catch((e) => console.error('[renderWorker] AI credit refund failed:', e))
    } else {
      await addCredits(
        failedVideo.userId,
        1,
        'refund',
        'Video render failed — credit returned'
      ).catch((e) => console.error('[renderWorker] Credit refund failed:', e))
    }

    throw error
  }
}
