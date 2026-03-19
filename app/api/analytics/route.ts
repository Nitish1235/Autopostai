import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'

// ── Query Schema ─────────────────────────────────────

const QuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  platform: z.string().default('all'),
})

// ── GET — Dashboard Analytics ────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const { period, platform } = parsed.data


    // Calculate date ranges
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - periodDays)

    // Build platform filter
    const platformFilter = platform !== 'all'
      ? { publishedPlatforms: { has: platform } }
      : {}

    // ── Fetch current period videos ──────────────────

    const currentVideos = await prisma.video.findMany({
      where: {
        userId,
        status: 'posted',
        postedAt: { gte: startDate },
        ...platformFilter,
      },
      include: { analytics: true },
    })

    // ── Fetch previous period videos ─────────────────

    const previousVideos = await prisma.video.findMany({
      where: {
        userId,
        status: 'posted',
        postedAt: { gte: prevStartDate, lt: startDate },
        ...platformFilter,
      },
      include: { analytics: true },
    })

    // ── Aggregate TOTALS ─────────────────────────────

    let totalViews = 0
    let totalLikes = 0
    let totalShares = 0
    let watchRateSum = 0
    let watchRateCount = 0

    for (const v of currentVideos) {
      if (v.analytics) {
        totalViews += v.analytics.totalViews
        totalLikes += v.analytics.totalLikes
        totalShares += v.analytics.totalShares
        if (v.analytics.watchRate > 0) {
          watchRateSum += v.analytics.watchRate
          watchRateCount++
        }
      }
    }

    const avgWatchRate = watchRateCount > 0 ? watchRateSum / watchRateCount : 0

    // Fetch followers
    const connections = await prisma.platformConnection.findMany({
      where: { userId, connected: true },
      select: { platform: true, followerCount: true },
    })
    const totalFollowers = connections.reduce((s, c) => s + c.followerCount, 0)

    // ── Calculate DELTAS ─────────────────────────────

    let prevViews = 0
    let prevLikes = 0
    let prevWatchRateSum = 0
    let prevWatchRateCount = 0

    for (const v of previousVideos) {
      if (v.analytics) {
        prevViews += v.analytics.totalViews
        prevLikes += v.analytics.totalLikes
        if (v.analytics.watchRate > 0) {
          prevWatchRateSum += v.analytics.watchRate
          prevWatchRateCount++
        }
      }
    }

    const prevAvgWatchRate = prevWatchRateCount > 0
      ? prevWatchRateSum / prevWatchRateCount
      : 0

    function calcDelta(current: number, previous: number) {
      if (previous === 0) return { value: current, delta: current > 0 ? 100 : 0, isPositive: current > 0 }
      const delta = ((current - previous) / previous) * 100
      return { value: current, delta: Math.round(delta * 10) / 10, isPositive: delta >= 0 }
    }

    // ── Views Over Time ──────────────────────────────

    const viewsByDate: Record<string, number> = {}

    // Initialize all days in period to 0
    for (let i = 0; i < periodDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      viewsByDate[key] = 0
    }

    // Sum daily views from all videos
    for (const v of currentVideos) {
      if (!v.analytics?.dailyViews) continue
      const daily = v.analytics.dailyViews as Array<{ date: string; views: number }>
      for (const entry of daily) {
        if (viewsByDate[entry.date] !== undefined) {
          viewsByDate[entry.date] += entry.views
        }
      }
    }

    const viewsOverTime = Object.entries(viewsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => {
        const d = new Date(date)
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          views,
        }
      })

    // ── Platform Breakdown ───────────────────────────

    const platformTotals: Record<string, number> = {}
    for (const v of currentVideos) {
      if (!v.analytics?.platformBreakdown) continue
      const breakdown = v.analytics.platformBreakdown as Record<string, { views: number }>
      for (const [plat, stats] of Object.entries(breakdown)) {
        platformTotals[plat] = (platformTotals[plat] ?? 0) + stats.views
      }
    }

    const totalPlatViews = Object.values(platformTotals).reduce((s, v) => s + v, 0)
    const platformBreakdown = Object.entries(platformTotals).map(([p, views]) => ({
      platform: p,
      views,
      percentage: totalPlatViews > 0 ? Math.round((views / totalPlatViews) * 100) : 0,
    }))

    // ── Top Videos ───────────────────────────────────

    const topVideos = currentVideos
      .filter((v) => v.analytics)
      .sort((a, b) => (b.analytics?.totalViews ?? 0) - (a.analytics?.totalViews ?? 0))
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        title: v.title,
        platforms: v.publishedPlatforms,
        views: v.analytics?.totalViews ?? 0,
        likes: v.analytics?.totalLikes ?? 0,
        watchRate: v.analytics?.watchRate ?? 0,
        postedAt: v.postedAt,
        thumbnailUrl: v.thumbnailUrl,
      }))

    // ── Best Topics ──────────────────────────────────

    const nicheStats: Record<string, { views: number; count: number }> = {}
    for (const v of currentVideos) {
      const niche = v.niche ?? 'general'
      if (!nicheStats[niche]) nicheStats[niche] = { views: 0, count: 0 }
      nicheStats[niche].views += v.analytics?.totalViews ?? 0
      nicheStats[niche].count++
    }

    const bestTopics = Object.entries(nicheStats)
      .map(([niche, stats]) => ({
        niche,
        avgViews: stats.count > 0 ? Math.round(stats.views / stats.count) : 0,
        videoCount: stats.count,
      }))
      .sort((a, b) => b.avgViews - a.avgViews)

    // ── Return ───────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          totalViews,
          totalLikes,
          totalShares,
          avgWatchRate: Math.round(avgWatchRate * 10) / 10,
          totalVideos: currentVideos.length,
          totalFollowers,
        },
        deltas: {
          views: calcDelta(totalViews, prevViews),
          likes: calcDelta(totalLikes, prevLikes),
          watchRate: calcDelta(avgWatchRate, prevAvgWatchRate),
          videosDelta: currentVideos.length - previousVideos.length,
          followers: { value: totalFollowers, delta: 0, isPositive: true },
        },
        viewsOverTime,
        platformBreakdown,
        topVideos,
        bestTopics,
      },
    })
  } catch (error) {
    console.error('[analytics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
