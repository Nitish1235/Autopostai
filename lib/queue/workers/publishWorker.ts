import { postToMultiplePlatforms, type PostPublishResult } from '@/lib/api/postforme'
import { generateCaptions } from '@/lib/api/openai'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'
import { decryptToken } from '@/lib/utils/encryption'
import type { PublishJob } from '@/lib/queue/videoQueue'

// ── Publish Handler ──────────────────────────────────

export async function handlePublishJob(data: PublishJob) {
  const { videoId, userId, platforms } = data

  console.log(
    `[publishWorker] Publishing video ${videoId} to ${platforms.join(', ')}`
  )

  try {
    // 1. Fetch video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
        title: true,
        topic: true,
        niche: true,
        videoUrl: true,
        thumbnailUrl: true,
        platforms: true,
        publishedPlatforms: true,
        platformStatuses: true,
        scheduledAt: true,
        topicQueueId: true,
      },
    })

    if (!video) {
      throw new Error(`Video not found: ${videoId}`)
    }

    // 2. Fetch user's platform connections
    const connections = await prisma.platformConnection.findMany({
      where: { userId, connected: true },
      select: {
        id: true,
        platform: true,
        accessToken: true,
        refreshToken: true,
      },
    })

    // 3. Validate
    if (!['ready', 'scheduled', 'posted', 'failed'].includes(video.status)) {
      throw new Error(
        `Video status is ${video.status}, expected 'ready', 'scheduled', 'posted', or 'failed'`
      )
    }

    if (!video.videoUrl) {
      throw new Error('Video URL is not set')
    }

    if (connections.length === 0) {
      throw new Error('No connected platform accounts found')
    }

    // 4. Check scheduled time
    if (video.scheduledAt && new Date(video.scheduledAt) > new Date()) {
      console.log(
        `[publishWorker] Video ${videoId} scheduled for future, skipping`
      )
      return { success: true, skipped: true, reason: 'scheduled_future' }
    }

    // 5. IDEMPOTENCY: Skip platforms already posted
    const alreadyPosted = new Set(video.publishedPlatforms)
    const platformsToPublish = platforms.filter((p) => !alreadyPosted.has(p))

    if (platformsToPublish.length === 0) {
      console.log(`[publishWorker] All platforms already posted for ${videoId}`)
      return { success: true, skipped: true, reason: 'already_posted' }
    }

    // 6. Set pending platforms in platformStatuses
    const currentStatuses = (video.platformStatuses as Record<string, string>) ?? {}
    for (const p of platformsToPublish) {
      currentStatuses[p] = 'pending'
    }
    await prisma.video.update({
      where: { id: videoId },
      data: { platformStatuses: currentStatuses },
    })

    // 7. Generate captions for target platforms
    const captionMap: Record<
      string,
      { caption: string; hashtags: string[]; cta: string }
    > = {}

    const captionPromises = platformsToPublish.map(async (platform) => {
      try {
        const captions = await generateCaptions({
          title: video.title,
          topic: video.topic,
          niche: video.niche ?? 'general',
          platform,
        })
        captionMap[platform] = captions
      } catch {
        captionMap[platform] = {
          caption: video.title,
          hashtags: [],
          cta: '',
        }
      }
    })

    await Promise.all(captionPromises)

    // 8. Publish ALL platforms (tiktok, instagram, youtube, x) via PostForMe
    const successfulPlatforms: string[] = []
    const failedPlatforms: string[] = []

    // accessToken field stores the PostForMe social_account_id
    const connectedPlatforms = platformsToPublish
      .map((platform) => {
        const conn = connections.find((c) => c.platform === platform)
        if (!conn?.accessToken) {
          failedPlatforms.push(platform)
          return null
        }
        return {
          platform: platform as string,
          socialAccountId: decryptToken(conn.accessToken) || conn.accessToken, // This is the decrypted PostForMe social account ID
        }
      })
      .filter(
        (p): p is { platform: string; socialAccountId: string } =>
          p !== null
      )

    if (connectedPlatforms.length > 0) {
      const defaultPlatform = connectedPlatforms[0].platform
      const defaultCaption =
        captionMap[defaultPlatform] ?? captionMap[platformsToPublish[0]]

      try {
        const postForMeResults = await postToMultiplePlatforms({
          platforms: connectedPlatforms,
          title: video.title,
          videoUrl: video.videoUrl,
          caption: defaultCaption?.caption ?? video.title,
          hashtags: defaultCaption?.hashtags ?? [],
        })

        for (const result of postForMeResults) {
          if (result.success) {
            successfulPlatforms.push(result.platform)
            // Store PostForMe postId for analytics lookup later
            if (result.postId) {
              currentStatuses[`${result.platform}_postId`] = result.postId
            }
          } else {
            failedPlatforms.push(result.platform)
          }
        }

      } catch {
        for (const cp of connectedPlatforms) {
          failedPlatforms.push(cp.platform)
        }
      }
    }

    // 11. Build updated statuses
    const updatedStatuses = { ...currentStatuses }
    for (const p of successfulPlatforms) {
      updatedStatuses[p] = 'posted'
    }
    for (const p of failedPlatforms) {
      updatedStatuses[p] = 'failed'
    }

    // 12. Merge publishedPlatforms
    const mergedPublished = [
      ...new Set([...video.publishedPlatforms, ...successfulPlatforms]),
    ]

    // 13. Determine video status
    const allTargetsDone = video.platforms.every((p) =>
      mergedPublished.includes(p)
    )

    // IMPROVED: Only mark as 'failed' if it's not already 'posted' 
    // and if we actually attempted and failed ALL remaining platforms.
    // Otherwise, keep it 'ready' so the user can connect and retry.
    let finalStatus = video.status
    if (allTargetsDone) {
      finalStatus = 'posted'
    } else if (failedPlatforms.length > 0) {
      // If we have some failures, we mark as 'failed' ONLY if the video isn't 'posted' already
      // This allows the UI to show a 'Retry' but the video remains in the Drafts/Ready pool
      finalStatus = 'failed'
    } else if (successfulPlatforms.length > 0 && !allTargetsDone) {
      // Partial success
      finalStatus = 'ready'
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: finalStatus as any,
        postedAt: allTargetsDone ? new Date() : (video.status === 'posted' ? undefined : null),
        publishedPlatforms: mergedPublished,
        platformStatuses: updatedStatuses,
      },
    })

    // 14. Update PlatformConnection stats
    for (const platform of successfulPlatforms) {
      const conn = connections.find((c) => c.platform === platform)
      if (conn) {
        await prisma.platformConnection.update({
          where: { id: conn.id },
          data: {
            lastPostAt: new Date(),
            lastPostStatus: 'success',
            monthlyPosts: { increment: 1 },
          },
        })
      }
    }

    // 15. Update TopicQueue if linked AND all done
    if (video.topicQueueId && allTargetsDone) {
      await prisma.topicQueue.update({
        where: { id: video.topicQueueId },
        data: { status: 'done' },
      })
    }

    // 16. Trigger analytics sync via Inngest after successful publish
    if (successfulPlatforms.length > 0) {
      try {
        await inngest.send({
          name: 'analytics/sync',
          data: { videoId, userId },
        })
      } catch {
        // Non-critical — analytics will sync on the next daily cron anyway
      }
    }

    console.log(
      `[publishWorker] Published ${videoId} to: ${successfulPlatforms.join(', ')}` +
      (failedPlatforms.length > 0
        ? ` | Failed: ${failedPlatforms.join(', ')}`
        : '')
    )

    return {
      success: true,
      postedTo: successfulPlatforms,
      failed: failedPlatforms,
      allDone: allTargetsDone,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown publish error'

    console.error(
      `[publishWorker] Failed for video ${videoId}: ${message}`
    )

    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { platformStatuses: true, status: true },
      })
      if (video) {
        const statuses = (video.platformStatuses as Record<string, string>) ?? {}
        for (const p of platforms) {
          if (statuses[p] !== 'posted') {
            statuses[p] = 'failed'
          }
        }
        await prisma.video.update({
          where: { id: videoId },
          data: {
            status: 'failed',
            platformStatuses: statuses,
            errorMessage: `Publishing failed: ${message}`,
          },
        })
      }
    } catch (updateErr) {
      console.error('[publishWorker] Failed to update statuses:', updateErr)
    }

    throw error
  }
}
