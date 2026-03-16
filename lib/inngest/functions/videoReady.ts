import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'
import { sendVideoReadyEmail } from '@/emails/VideoReady'

// ── On Video Ready ───────────────────────────────────
// Triggered when video rendering is complete (video/ready event)

export const onVideoReady = inngest.createFunction(
  { id: 'on-video-ready', name: 'On Video Ready' },
  { event: 'video/ready' },
  async ({ event, step }) => {
    const { videoId, userId } = event.data

    // Step 1 — Fetch video and user
    const context = await step.run('fetch-video-and-user', async () => {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          id: true,
          title: true,
          topic: true,
          thumbnailUrl: true,
          platforms: true,
          videoUrl: true,
        },
      })

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          notifyVideoReady: true,
          platformConnections: {
            where: { connected: true },
            select: { platform: true, accessToken: true },
          },
        },
      })

      const autopilotConfig = await prisma.autopilotConfig.findUnique({
        where: { userId },
        select: { approvalMode: true, enabled: true },
      })

      return { video, user, autopilotConfig }
    })

    if (!context.video || !context.user) {
      return { processed: false, reason: 'Video or user not found' }
    }

    const { video, user, autopilotConfig } = context
    const approvalMode = autopilotConfig?.approvalMode ?? 'review'

    // Step 2 — Send notification
    await step.run('send-notification', async () => {
      if (user.notifyVideoReady && user.email) {
        await sendVideoReadyEmail({
          email: user.email,
          name: user.name ?? 'Creator',
          videoTitle: video.title,
          videoId: video.id,
          thumbnailUrl: video.thumbnailUrl ?? undefined,
          approvalMode: approvalMode as 'review' | 'autopilot',
        })
      }
    })

    // Step 3 — Handle autopilot posting
    await step.run('handle-autopilot-posting', async () => {
      if (approvalMode === 'autopilot') {
        // Immediately add ONE combined publish job for ALL platforms
        // publishWorker calls PostForMe once with all social account IDs
        const connectedPlatforms = user.platformConnections.map(
          (c) => c.platform
        )

        const platforms = video.platforms.filter((p) =>
          connectedPlatforms.includes(p)
        )

        if (platforms.length > 0) {
          await enqueueJob('/api/jobs/publish', {
            videoId: video.id,
            userId,
            platforms,
          })
        }
      }
    })

    // Step 4 — Handle review mode with 24h deadline
    if (approvalMode === 'review') {
      // Wait 23 hours
      await step.sleep('review-deadline-wait', '23h')

      await step.run('check-review-deadline', async () => {
        // Re-fetch video to check current status
        const currentVideo = await prisma.video.findUnique({
          where: { id: videoId },
          select: { status: true, platforms: true },
        })

        // If video is still in 'ready' status after 23h — auto-publish
        if (currentVideo?.status === 'ready') {
          const connectedPlatforms = user.platformConnections.map(
            (c) => c.platform
          )

          const platforms = currentVideo.platforms.filter((p) =>
            connectedPlatforms.includes(p)
          )

          if (platforms.length > 0) {
            // One combined job for all platforms
            await enqueueJob('/api/jobs/publish', {
              videoId: video.id,
              userId,
              platforms,
            })
          }
        }
      })
    }

    return { processed: true }
  }
)
