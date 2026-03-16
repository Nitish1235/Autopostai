import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'

// ── Schema ───────────────────────────────────────────

const PublishSchema = z.object({
  platforms: z.array(
    z.enum(['tiktok', 'instagram', 'youtube', 'x'])
  ).min(1),
  scheduledAt: z.string().datetime().optional(),
})

// ── POST — Publish Video ─────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params

    const body = await request.json()
    const parsed = PublishSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { platforms, scheduledAt } = parsed.data

    // Fetch video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        userId: true,
        status: true,
        videoUrl: true,
        publishedPlatforms: true,
        platformStatuses: true,
      },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    if (video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Must be in 'ready' or 'posted' status (posted = re-publish remaining)
    if (video.status !== 'ready' && video.status !== 'posted') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot publish: video is in "${video.status}" status`,
        },
        { status: 400 }
      )
    }

    if (!video.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Video URL not available' },
        { status: 400 }
      )
    }

    // Filter out platforms already posted (idempotency)
    const alreadyPosted = new Set(video.publishedPlatforms)
    const platformsToPublish = platforms.filter((p) => !alreadyPosted.has(p))

    if (platformsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All requested platforms already posted',
      })
    }

    // Initialize platformStatuses for targets
    const currentStatuses = (video.platformStatuses as Record<string, string>) ?? {}
    for (const p of platformsToPublish) {
      currentStatuses[p] = 'pending'
    }

    // Update video with platforms and statuses
    const updateData: Record<string, unknown> = {
      platforms,
      platformStatuses: currentStatuses,
    }

    if (scheduledAt) {
      // Schedule for future
      updateData.scheduledAt = new Date(scheduledAt)
      updateData.status = 'scheduled'

      await prisma.video.update({
        where: { id: videoId },
        data: updateData,
      })

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledAt,
      })
    }

    // Publish immediately
    await prisma.video.update({
      where: { id: videoId },
      data: updateData,
    })

    await enqueueJob('/api/jobs/publish', {
      videoId,
      userId: userId,
      platforms: platformsToPublish,
    }, {
      deduplicationId: `publish-${videoId}-${Date.now()}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[publish] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
