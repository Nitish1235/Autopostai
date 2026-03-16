// ── Weekly Performance Report ─────────────────────────

import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key')

// ── Weekly Report Function ───────────────────────────

export const weeklyReport = inngest.createFunction(
  { id: 'weekly-report', name: 'Weekly Performance Report' },
  { cron: '0 9 * * 1' },
  async ({ step }) => {
    // Step 1 — Find eligible users
    const eligibleUsers = await step.run('find-eligible-users', async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Users with notifyWeeklyReport=true who posted at least 1 video in last 7 days
      const users = await prisma.user.findMany({
        where: {
          notifyWeeklyReport: true,
          videos: {
            some: {
              status: 'posted',
              postedAt: { gte: sevenDaysAgo },
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })

      return users
    })

    // Step 2 — Send reports
    const sentCount = await step.run('send-reports', async () => {
      let sent = 0
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      for (const user of eligibleUsers) {
        try {
          // Calculate this week's stats
          const postedVideos = await prisma.video.findMany({
            where: {
              userId: user.id,
              status: 'posted',
              postedAt: { gte: sevenDaysAgo },
            },
            select: {
              id: true,
              title: true,
              postedAt: true,
              analytics: {
                select: {
                  totalViews: true,
                  totalLikes: true,
                },
              },
            },
            orderBy: { postedAt: 'desc' },
          })

          // Aggregate stats
          const totalVideos = postedVideos.length
          let totalViews = 0
          let totalLikes = 0
          let topVideoTitle = ''
          let topVideoViews = 0

          for (const video of postedVideos) {
            const views = video.analytics?.totalViews ?? 0
            const likes = video.analytics?.totalLikes ?? 0
            totalViews += views
            totalLikes += likes

            if (views > topVideoViews) {
              topVideoViews = views
              topVideoTitle = video.title
            }
          }

          // Get follower growth
          const connections = await prisma.platformConnection.findMany({
            where: { userId: user.id, connected: true },
            select: {
              platform: true,
              followerCount: true,
            },
          })

          const totalFollowers = connections.reduce(
            (sum, c) => sum + c.followerCount,
            0
          )

          // Send email
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.video',
            to: user.email,
            subject: `Your weekly report: ${totalViews.toLocaleString()} views this week`,
            html: buildWeeklyReportHTML({
              name: user.name,
              totalVideos,
              totalViews,
              totalLikes,
              topVideoTitle,
              topVideoViews,
              totalFollowers,
              platformCount: connections.length,
            }),
          })

          sent++
        } catch (userError) {
          console.error(
            `[weeklyReport] Failed for user ${user.id}:`,
            userError
          )
        }
      }

      return sent
    })

    return { sent: sentCount, eligible: eligibleUsers.length }
  }
)

// ── HTML Email Template ──────────────────────────────

function buildWeeklyReportHTML(data: {
  name: string
  totalVideos: number
  totalViews: number
  totalLikes: number
  topVideoTitle: string
  topVideoViews: number
  totalFollowers: number
  platformCount: number
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: Inter, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #e5e5e5;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 20px; font-weight: 600; color: #ffffff; margin: 0;">
          AutoPost AI — Weekly Report
        </h1>
        <p style="font-size: 13px; color: #888; margin-top: 8px;">
          Here's how your content performed this week
        </p>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #141414; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #222;">
          <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${data.totalViews.toLocaleString()}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Total Views</div>
        </div>
        <div style="flex: 1; background: #141414; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #222;">
          <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${data.totalLikes.toLocaleString()}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Total Likes</div>
        </div>
        <div style="flex: 1; background: #141414; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #222;">
          <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${data.totalVideos}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Videos Posted</div>
        </div>
      </div>

      ${data.topVideoTitle ? `
      <div style="background: #141414; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #222;">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          🏆 Top Performing Video
        </div>
        <div style="font-size: 16px; font-weight: 600; color: #ffffff;">
          ${data.topVideoTitle}
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 4px;">
          ${data.topVideoViews.toLocaleString()} views
        </div>
      </div>
      ` : ''}

      <div style="background: #141414; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #222;">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Audience
        </div>
        <div style="font-size: 16px; color: #ffffff;">
          <strong>${data.totalFollowers.toLocaleString()}</strong> total followers across <strong>${data.platformCount}</strong> platform${data.platformCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.video'}/dashboard"
           style="display: inline-block; background: #ffffff; color: #0a0a0a; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Full Analytics →
        </a>
      </div>

      <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #555;">
        <p>Keep creating, ${data.name}! 🚀</p>
        <p style="margin-top: 12px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.video'}/settings" style="color: #555; text-decoration: underline;">
            Manage notification preferences
          </a>
        </p>
      </div>
    </body>
    </html>
  `
}
