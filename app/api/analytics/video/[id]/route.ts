import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'

// ── GET — Single Video Analytics ─────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!video || video.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    // Fetch analytics
    const analytics = await prisma.videoAnalytics.findUnique({
      where: { videoId: id },
    })

    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'No analytics available yet' },
        { status: 404 }
      )
    }

    // If lastSyncedAt is > 6 hours ago, trigger background sync
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    if (!analytics.lastSyncedAt || analytics.lastSyncedAt < sixHoursAgo) {
      void inngest
        .send({
          name: 'analytics/sync',
          data: {
            userId: session.user.id,
            videoId: id,
          },
        })
        .catch(() => { })
    }

    // Parse JSON fields
    const platformBreakdown = analytics.platformBreakdown as Record<string, unknown> | null
    const dailyViews = analytics.dailyViews as Array<{ date: string; views: number }> | null

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        platformBreakdown,
        dailyViews,
      },
    })
  } catch (error) {
    console.error('[analytics/video] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
