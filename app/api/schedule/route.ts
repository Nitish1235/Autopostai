import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'

// ── Query Schema ─────────────────────────────────────

const QuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  platform: z.string().optional(),
})

// ── GET — Scheduled Posts for Calendar ───────────────

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
        { success: false, error: 'Invalid parameters. startDate and endDate are required.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, platform } = parsed.data

    const where: Record<string, unknown> = {
      userId: userId,
      scheduledAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: { in: ['scheduled', 'posted'] },
    }

    if (platform && platform !== 'all') {
      where.platforms = { has: platform }
    }

    const videos = await prisma.video.findMany({
      where,
      include: {
        analytics: {
          select: { totalViews: true, totalLikes: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    const result = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      platforms: v.publishedPlatforms,
      scheduledAt: v.scheduledAt,
      postedAt: v.postedAt,
      status: v.status,
      analytics: v.analytics
        ? { totalViews: v.analytics.totalViews, totalLikes: v.analytics.totalLikes }
        : null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[schedule] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
