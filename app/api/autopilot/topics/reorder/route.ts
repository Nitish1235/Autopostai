import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'

// ── Schema ───────────────────────────────────────────

const ReorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
})

// ── POST — Reorder Topics ────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = ReorderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { orderedIds } = parsed.data

    // Verify all IDs belong to user
    const topics = await prisma.topicQueue.findMany({
      where: {
        id: { in: orderedIds },
        userId: userId,
      },
      select: { id: true },
    })

    if (topics.length !== orderedIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some topic IDs are invalid or do not belong to you' },
        { status: 400 }
      )
    }

    // Batch update order
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.topicQueue.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[autopilot/topics/reorder] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
