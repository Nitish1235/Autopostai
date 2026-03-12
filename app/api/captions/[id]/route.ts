import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { generateCaptions } from '@/lib/api/openai'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy_token',
})

// ── PUT Schema ───────────────────────────────────────

const CaptionsSchema = z.object({
  captions: z.record(
    z.object({
      caption: z.string(),
      hashtags: z.array(z.string()),
      cta: z.string(),
    })
  ),
})

// ── GET — Generate Captions for All Platforms ────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, title: true, topic: true, niche: true },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    // Check Redis cache
    const cacheKey = `captions:${videoId}`
    const cached = await redis.get<string>(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      })
    }

    // Generate captions for all 4 platforms in parallel
    const [tiktok, instagram, youtube, x] = await Promise.all([
      generateCaptions({
        title: video.title,
        topic: video.topic ?? video.title,
        niche: video.niche ?? 'general',
        platform: 'tiktok',
      }),
      generateCaptions({
        title: video.title,
        topic: video.topic ?? video.title,
        niche: video.niche ?? 'general',
        platform: 'instagram',
      }),
      generateCaptions({
        title: video.title,
        topic: video.topic ?? video.title,
        niche: video.niche ?? 'general',
        platform: 'youtube',
      }),
      generateCaptions({
        title: video.title,
        topic: video.topic ?? video.title,
        niche: video.niche ?? 'general',
        platform: 'x',
      }),
    ])

    const captions = { tiktok, instagram, youtube, x }

    // Cache in Redis with 1hr TTL
    await redis.set(cacheKey, JSON.stringify(captions), { ex: 3600 })

    return NextResponse.json({
      success: true,
      data: captions,
      cached: false,
    })
  } catch (error) {
    console.error('[captions/GET] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── PUT — Save Custom Captions ───────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params
    const body = await request.json()
    const parsed = CaptionsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    // Save to Redis cache with 7 day TTL
    const cacheKey = `captions:${videoId}`
    await redis.set(cacheKey, JSON.stringify(parsed.data.captions), { ex: 604800 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[captions/PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
