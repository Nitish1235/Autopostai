import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'

// ── Scheduled Post Publisher ─────────────────────────
// Runs every 15 minutes to check for scheduled posts due now

export const scheduledPublish = inngest.createFunction(
  { id: 'scheduled-publish', name: 'Scheduled Post Publisher' },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    // Step 1 — Find due posts
    const duePosts = await step.run('find-due-posts', async () => {
      const now = new Date()
      const windowStart = new Date(now.getTime() - 20 * 60 * 1000) // 20 min window

      return prisma.video.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
          title: true,
          topic: true,
          videoUrl: true,
          thumbnailUrl: true,
          platforms: true,
          scheduledAt: true,
          niche: true,
          user: {
            select: {
              platformConnections: {
                where: { connected: true },
                select: {
                  platform: true,
                  accessToken: true,
                },
              },
            },
          },
        },
      })
    })

    if (duePosts.length === 0) {
      return { published: 0 }
    }

    // Step 2 — Publish due posts
    const publishCount = await step.run('publish-due-posts', async () => {
      let count = 0

      for (const video of duePosts) {
        try {
          // Verify user still has connected platforms
          const connectedPlatforms = video.user.platformConnections.map(
            (c) => c.platform
          )

          const validPlatforms = video.platforms.filter((p) =>
            connectedPlatforms.includes(p)
          )

          if (validPlatforms.length === 0) {
            console.warn(
              `[scheduledPublish] No connected platforms for video ${video.id}`
            )
            continue
          }

          // One combined publish job for ALL valid platforms
          // publishWorker calls PostForMe once with multiple social account IDs
          await enqueueJob('/api/jobs/publish', {
            videoId: video.id,
            userId: video.userId,
            platforms: validPlatforms,
          })

          count++
        } catch (error) {
          console.error(
            `[scheduledPublish] Failed to queue video ${video.id}:`,
            error
          )
        }
      }

      return count
    })

    // Step 3 — Send notifications for users with posting notifications
    await step.run('send-notifications', async () => {
      const userIds = [...new Set(duePosts.map((v) => v.userId))]

      for (const userId of userIds) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { notifyVideoPosted: true },
          })

          if (user?.notifyVideoPosted) {
            const userVideos = duePosts.filter((v) => v.userId === userId)
            for (const video of userVideos) {
              await inngest.send({
                name: 'video/posted',
                data: {
                  videoId: video.id,
                  userId,
                  platforms: video.platforms,
                },
              })
            }
          }
        } catch {
          // Non-critical
        }
      }
    })

    return { published: publishCount }
  }
)
