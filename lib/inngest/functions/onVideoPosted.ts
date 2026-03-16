// ── On Video Posted — Immediate Analytics Sync ───────
// Triggered by publishWorker right after a video is successfully posted.
// Runs an immediate analytics fetch so the dashboard shows fresh data
// rather than waiting for the next daily cron at 6am UTC.

import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { getPostAnalytics } from '@/lib/api/postforme'

export const onVideoPosted = inngest.createFunction(
  {
    id: 'on-video-posted',
    name: 'On Video Posted — Analytics Sync',
    // Debounce: if the same video triggers multiple times (multi-platform)
    // only run once per videoId with a 30s window
    debounce: { key: 'event.data.videoId', period: '30s' },
  },
  { event: 'analytics/sync' },
  async ({ event, step }) => {
    const { videoId, userId } = event.data

    // Step 1 — fetch video + platform connections
    const context = await step.run('fetch-video', async () => {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          id: true,
          publishedPlatforms: true,
          platformStatuses: true,
          analytics: { select: { id: true, dailyViews: true, platformBreakdown: true } },
          user: {
            select: {
              platformConnections: {
                where: { connected: true },
                select: { platform: true, accessToken: true },
              },
            },
          },
        },
      })
      return video
    })

    if (!context || context.publishedPlatforms.length === 0) {
      return { synced: false, reason: 'no published platforms' }
    }

    // Step 2 — sync analytics for each published platform
    await step.run('sync-analytics', async () => {
      const statuses = (context.platformStatuses ?? {}) as Record<string, string>

      const platformBreakdown: Record<
        string,
        { views: number; likes: number; shares: number; comments: number; watchRate: number }
      > = (context.analytics?.platformBreakdown ?? {}) as typeof platformBreakdown

      let totalViews = 0
      let totalLikes = 0
      let totalShares = 0
      let totalComments = 0

      for (const platform of context.publishedPlatforms) {
        const conn = context.user.platformConnections.find((c) => c.platform === platform)
        if (!conn?.accessToken) continue

        // Use the PostForMe post ID stored by publishWorker (stored as `{platform}_postId`)
        const postId = statuses[`${platform}_postId`]
        if (!postId) continue

        try {
          const analytics = await getPostAnalytics({
            platform,
            postId,                    // ← PostForMe post ID, not DB videoId
            accessToken: conn.accessToken,
          })

          platformBreakdown[platform] = {
            views: analytics.views,
            likes: analytics.likes,
            shares: analytics.shares,
            comments: analytics.comments,
            watchRate: analytics.watchRate,
          }

          totalViews += analytics.views
          totalLikes += analytics.likes
          totalShares += analytics.shares
          totalComments += analytics.comments
        } catch (err) {
          console.warn(`[onVideoPosted] Analytics fetch failed for ${platform}/${videoId}:`, err)
        }
      }

      if (totalViews === 0 && Object.keys(platformBreakdown).length === 0) return

      const today = new Date().toISOString().split('T')[0]
      const existingDaily = ((context.analytics?.dailyViews ?? []) as Array<{ date: string; views: number }>)
      const updatedDaily = [
        ...existingDaily.filter((d) => d.date !== today),
        { date: today, views: totalViews },
      ].slice(-30)

      await prisma.videoAnalytics.upsert({
        where: { videoId },
        create: {
          videoId,
          totalViews,
          totalLikes,
          totalShares,
          totalComments,
          watchRate: Object.keys(platformBreakdown).length > 0
            ? Object.values(platformBreakdown).reduce((s, p) => s + p.watchRate, 0) /
              Object.keys(platformBreakdown).length
            : 0,
          platformBreakdown,
          dailyViews: updatedDaily,
          lastSyncedAt: new Date(),
        },
        update: {
          totalViews,
          totalLikes,
          totalShares,
          totalComments,
          watchRate: Object.keys(platformBreakdown).length > 0
            ? Object.values(platformBreakdown).reduce((s, p) => s + p.watchRate, 0) /
              Object.keys(platformBreakdown).length
            : 0,
          platformBreakdown,
          dailyViews: updatedDaily,
          lastSyncedAt: new Date(),
        },
      })
    })

    return { synced: true, videoId }
  }
)
