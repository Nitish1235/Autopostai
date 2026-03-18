// ── Daily Analytics Sync ─────────────────────────────

import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { getPostAnalytics } from '@/lib/api/postforme'
import {
  refreshYouTubeToken,
  getYouTubeVideoStats,
} from '@/lib/api/youtube'
import { decryptToken, encryptToken } from '@/lib/utils/encryption'

// ── Analytics Poll Function ──────────────────────────

export const analyticsPoll = inngest.createFunction(
  { id: 'analytics-poll', name: 'Daily Analytics Sync' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    // Step 1 — Find posted videos from last 30 days
    const videos = await step.run('find-posted-videos', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      return prisma.video.findMany({
        where: {
          status: 'posted',
          postedAt: { gte: thirtyDaysAgo },
        },
        select: {
          id: true,
          userId: true,
          publishedPlatforms: true,
          platformStatuses: true,  // contains {platform}_postId keys from publishWorker
          postedAt: true,
          user: {
            select: {
              platformConnections: {
                where: { connected: true },
                select: {
                  platform: true,
                  accessToken: true,
                  refreshToken: true,
                },
              },
            },
          },
          analytics: {
            select: {
              id: true,
              platformBreakdown: true,
              dailyViews: true,
            },
          },
        },
      })
    })

    // Step 2 — Sync analytics for each video
    const syncedCount = await step.run('sync-analytics', async () => {
      let synced = 0

      for (const video of videos) {
        try {
          const platformBreakdown: Record<
            string,
            {
              views: number
              likes: number
              shares: number
              comments: number
              watchRate: number
            }
          > = (video.analytics?.platformBreakdown as Record<
            string,
            {
              views: number
              likes: number
              shares: number
              comments: number
              watchRate: number
            }
          >) ?? {}

          let totalViews = 0
          let totalLikes = 0
          let totalShares = 0
          let totalComments = 0

          for (const platform of video.publishedPlatforms) {
            const connection = video.user.platformConnections.find(
              (c) => c.platform === platform
            )
            if (!connection?.accessToken) continue

            // Extract the PostForMe post ID stored by publishWorker
            // Format: platformStatuses[`${platform}_postId`] = 'pfm_xxx...'
            const statuses = (video.platformStatuses ?? {}) as Record<string, string>
            const postId = statuses[`${platform}_postId`]
            if (!postId) {
              // No PostForMe postId stored — video predates this feature or failed to post
              continue
            }

            try {
              let postAnalytics

              if (platform === 'youtube') {
                // ── YouTube: use native YouTube Data API ──
                // The stored youtube_postId is the YouTube video ID (e.g. "dQw4w9WgXcQ")
                if (!postId) continue

                if (!connection?.refreshToken) continue
                const rawRefreshToken = decryptToken(connection.refreshToken) || connection.refreshToken

                let accessToken = decryptToken(connection.accessToken) || connection.accessToken
                try {
                  const refreshed = await refreshYouTubeToken(rawRefreshToken)
                  accessToken = refreshed.accessToken
                  // Save refreshed token back to DB
                  const ytConn = video.user.platformConnections.find((c) => c.platform === 'youtube')
                  if (ytConn) {
                    await prisma.platformConnection.updateMany({
                      where: { userId: video.userId, platform: 'youtube' },
                      data: {
                        accessToken: encryptToken(refreshed.accessToken) ?? refreshed.accessToken,
                        tokenExpiry: refreshed.expiresAt,
                      },
                    })
                  }
                } catch {
                  // Use existing token if refresh fails
                }

                postAnalytics = await getYouTubeVideoStats({
                  accessToken,
                  ytVideoId: postId,
                })
              } else {
                // ── Other platforms: PostForMe analytics ──
                postAnalytics = await getPostAnalytics({
                  platform,
                  postId,
                  accessToken: connection.accessToken,
                })
              }

              if (postAnalytics) {
                platformBreakdown[platform] = {
                  views: postAnalytics.views,
                  likes: postAnalytics.likes,
                  shares: postAnalytics.shares,
                  comments: postAnalytics.comments,
                  watchRate: postAnalytics.watchRate,
                }
              }
            } catch (platError) {
              console.error(
                `[analyticsPoll] Failed for ${platform}/${video.id}:`,
                platError
              )
              continue
            }
          }

          // Sum totals
          for (const stats of Object.values(platformBreakdown)) {
            totalViews += stats.views
            totalLikes += stats.likes
            totalShares += stats.shares
            totalComments += stats.comments
          }

          // Update daily views time series
          const existingDaily = (video.analytics?.dailyViews ?? []) as Array<{
            date: string
            views: number
          }>
          const today = new Date().toISOString().split('T')[0]
          const updatedDaily = [
            ...existingDaily.filter((d) => d.date !== today),
            { date: today, views: totalViews },
          ].slice(-30) // Keep last 30 days

          // Upsert analytics
          await prisma.videoAnalytics.upsert({
            where: { videoId: video.id },
            create: {
              videoId: video.id,
              totalViews,
              totalLikes,
              totalShares,
              totalComments,
              watchRate:
                totalViews > 0
                  ? Object.values(platformBreakdown).reduce(
                    (sum, p) => sum + p.watchRate,
                    0
                  ) / Object.keys(platformBreakdown).length
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
              watchRate:
                totalViews > 0
                  ? Object.values(platformBreakdown).reduce(
                    (sum, p) => sum + p.watchRate,
                    0
                  ) / Object.keys(platformBreakdown).length
                  : 0,
              platformBreakdown,
              dailyViews: updatedDaily,
              lastSyncedAt: new Date(),
            },
          })

          synced++
        } catch (videoError) {
          console.error(
            `[analyticsPoll] Failed syncing video ${video.id}:`,
            videoError
          )
        }
      }

      return synced
    })

    // Step 3 — Follower count sync
    // NOTE: PostForMe API v1 does not expose a follower count endpoint.
    // All platform accounts' followerCount stays at 0 until PostForMe adds this.
    // Milestone email notifications are therefore also disabled until then.
    const updatedAccounts = 0


    return {
      synced: syncedCount,
      followerUpdates: updatedAccounts,
      videosProcessed: videos.length,
    }
  }
)
