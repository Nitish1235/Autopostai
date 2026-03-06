import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/authOptions'
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const status = searchParams.get('status') ?? undefined

    const where: Record<string, unknown> = {
      userId: session.user.id,
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Handle regenerate all topics
    if (body.regenerate === true) {
      // Topic regeneration available on all plans

      // Delete all pending topics
      await prisma.topicQueue.deleteMany({
        where: { userId: session.user.id, status: 'pending' },
      })

      // Get niche from config
      const config = await prisma.autopilotConfig.findUnique({
        where: { userId: session.user.id },
        select: { niche: true },
      })

      // Trigger generation
      await inngest.send({
        name: 'topics/generate',
        data: {
          userId: session.user.id,
          niche: config?.niche ?? 'finance',
          count: 7,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Generating new topics...',
      })
    }

    // Handle add single topic
    const parsed = AddTopicSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get max order
    const maxOrderResult = await prisma.topicQueue.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (maxOrderResult?.order ?? -1) + 1

    // Get user's default niche if not provided
    let niche = parsed.data.niche
    if (!niche) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { defaultNiche: true },
      })
      niche = user?.defaultNiche ?? 'general'
    }

    const topic = await prisma.topicQueue.create({
      data: {
        userId: session.user.id,
        topic: parsed.data.topic,
        niche,
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
    const session = await auth()
    if (!session?.user?.id) {
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

    if (!topic || topic.userId !== session.user.id) {
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
