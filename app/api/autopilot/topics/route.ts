import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'

// ── POST Schema ──────────────────────────────────────

const AddTopicSchema = z.object({
  topic: z.string().min(10).max(300),
  niche: z.string().optional(),
  regenerate: z.boolean().optional(),
})

// ── GET — List Topic Queue ───────────────────────────

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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const status = searchParams.get('status') ?? undefined

    const where: Record<string, any> = {
      userId: userId,
    }
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [topics, total] = await Promise.all([
      prisma.topicQueue.findMany({
        where,
        orderBy: { order: 'asc' },
        skip,
        take: limit,
        include: {
          video: {
            select: { id: true, status: true, title: true, thumbnailUrl: true },
          },
        },
      }),
      prisma.topicQueue.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        topics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('[autopilot/topics/GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── POST — Add Topic or Regenerate All ───────────────

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

    // Handle regenerate all topics
    if (body.regenerate === true) {
      // TRIGGER GENERATION - FIX #1: Add 15-min cooldown to prevent cost leaks
      const config = await prisma.autopilotConfig.findUnique({
        where: { userId: userId },
        select: { niche: true, topicsGeneratedAt: true },
      })

      if (config?.topicsGeneratedAt) {
        const lastGen = new Date(config.topicsGeneratedAt).getTime()
        const diff = Date.now() - lastGen
        const COOLDOWN = 15 * 60 * 1000 // 15 mins
        if (diff < COOLDOWN) {
          const waitMins = Math.ceil((COOLDOWN - diff) / 60000)
          return NextResponse.json(
            { success: false, error: `Please wait ${waitMins}m before regenerating topics again.` },
            { status: 429 }
          )
        }
      }

      // Delete all pending topics
      await prisma.topicQueue.deleteMany({
        where: { userId: userId, status: 'pending' },
      })

      // Trigger generation
      await inngest.send({
        name: 'topics/generate',
        data: {
          userId: userId,
          niche: config?.niche ?? 'finance',
          count: 10,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Generating new topics...',
      })
    }

    // Handle add single topic - FIX #4: Max 50 pending topics limit
    const pendingCount = await prisma.topicQueue.count({
      where: { userId: userId, status: 'pending' }
    })
    if (pendingCount >= 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum topic queue size (50) reached. Delete some topics first.' },
        { status: 400 }
      )
    }

    const parsed = AddTopicSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get max order
    const maxOrderResult = await prisma.topicQueue.findFirst({
      where: { userId: userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (maxOrderResult?.order ?? -1) + 1

    // Get user's default niche if not provided
    let niche = parsed.data.niche
    if (!niche) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultNiche: true },
      })
      niche = (u as any)?.defaultNiche ?? 'general'
    }

    const topic = await prisma.topicQueue.create({
      data: {
        userId: userId,
        topic: parsed.data.topic,
        niche: niche as string,
        order: nextOrder,
        status: 'pending',
      },
    })

    return NextResponse.json({ success: true, data: topic })
  } catch (error) {
    console.error('[autopilot/topics/POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── DELETE — Remove Single Topic ─────────────────────

export async function DELETE(request: Request) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing topic id' },
        { status: 400 }
      )
    }

    // Verify ownership
    const topic = await prisma.topicQueue.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!topic || topic.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Topic not found' },
        { status: 404 }
      )
    }

    await prisma.topicQueue.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[autopilot/topics/DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
