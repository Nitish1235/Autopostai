import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

// ── Schema ───────────────────────────────────────────

const BulkSchema = z.object({
  updates: z.array(
    z.object({
      videoId: z.string(),
      scheduledAt: z.string().datetime(),
    })
  ).min(1),
})

// ── POST — Bulk Reschedule ───────────────────────────

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = BulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { updates } = parsed.data

    // Verify all videoIds belong to user and are in editable status
    const videoIds = updates.map((u) => u.videoId)
    const videos = await prisma.video.findMany({
      where: {
        id: { in: videoIds },
        userId: userId,
        status: { in: ['ready', 'scheduled'] },
      },
      select: { id: true },
    })

    const foundIds = videos.map((v) => v.id)
    const invalidIds = videoIds.filter((id) => !foundIds.includes(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot reschedule videos with IDs: ${invalidIds.join(', ')}. Videos must be in ready or scheduled status.`,
        },
        { status: 409 }
      )
    }

    // Batch update in transaction
    await prisma.$transaction(
      updates.map(({ videoId, scheduledAt }) =>
        prisma.video.update({
          where: { id: videoId },
          data: {
            scheduledAt: new Date(scheduledAt),
            status: 'scheduled',
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      updated: updates.length,
    })
  } catch (error) {
    console.error('[schedule/bulk] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
