import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'

// ── Schema ───────────────────────────────────────────

const ToggleSchema = z.object({
  enabled: z.boolean(),
})

// ── POST — Toggle Autopilot ──────────────────────────

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
    const parsed = ToggleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      )
    }

    const { enabled } = parsed.data

    // Update config and reset failures
    await prisma.autopilotConfig.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        enabled,
        consecutiveFailures: 0
      },
      update: {
        enabled,
        consecutiveFailures: 0
      },
    })

    // If enabling and queue is empty: trigger topic generation
    if (enabled) {
      const pendingCount = await prisma.topicQueue.count({
        where: { userId: userId, status: 'pending' },
      })

      if (pendingCount === 0) {
        const config = await prisma.autopilotConfig.findUnique({
          where: { userId: userId },
          select: { niche: true },
        })

        try {
          await inngest.send({
            name: 'topics/generate',
            data: {
              userId: userId,
              niche: config?.niche ?? 'finance',
              count: 7,
            },
          })
        } catch {
          // Non-critical
        }
      }
    }

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error('[autopilot/toggle] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
