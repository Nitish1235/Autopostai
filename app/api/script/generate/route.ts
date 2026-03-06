import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/authOptions'
import { generateScript } from '@/lib/api/openai'
import { checkCredits } from '@/lib/utils/credits'
import { Redis } from '@upstash/redis'

// ── Redis for Rate Limiting ──────────────────────────
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

// ── Request Schema ───────────────────────────────────
const schema = z.object({
  topic: z.string().min(10).max(500),
  niche: z.string(),
  format: z.enum(['30s', '60s', '90s']),
})

// ── POST /api/script/generate ────────────────────────
// Called from Create Wizard Step 1 to generate a script
// preview BEFORE creating a video. No DB write yet.

export async function POST(request: NextRequest) {
  try {
    // 1. Validate session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 2. Check credits
    const creditStatus = await checkCredits(userId)
    if (!creditStatus.hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits. Please upgrade your plan or purchase credits.',
        },
        { status: 402 }
      )
    }

    // 3. Rate limiting: max 5 per user per hour
    const rateLimitKey = `script_limit:${userId}`
    const currentCount = await redis.incr(rateLimitKey)

    // Set expiry on first call (when count is 1)
    if (currentCount === 1) {
      await redis.expire(rateLimitKey, 3600)
    }

    if (currentCount > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Maximum 5 script generations per hour.',
        },
        { status: 429 }
      )
    }

    // 4. Validate input
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { topic, niche, format } = parsed.data

    // 5. Generate script (no DB write — preview only)
    const result = await generateScript({ topic, niche, format })

    return NextResponse.json({
      success: true,
      data: {
        title: result.title,
        segments: result.segments,
        totalEstimatedDuration: result.totalEstimatedDuration,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/script/generate] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
