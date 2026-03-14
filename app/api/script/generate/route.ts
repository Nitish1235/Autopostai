import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { generateScript } from '@/lib/api/openai'
import { checkCredits } from '@/lib/utils/credits'

// ── Redis for Rate Limiting (lazy init) ─────────────
// If UPSTASH env vars are missing, rate limiting is skipped gracefully.

let _redis: import('@upstash/redis').Redis | null = null
let _redisChecked = false

async function getRedis() {
  if (_redisChecked) return _redis
  _redisChecked = true
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url.includes('dummy')) {
    console.warn('[script/generate] Upstash Redis not configured — rate limiting disabled')
    return null
  }
  const { Redis } = await import('@upstash/redis')
  _redis = new Redis({ url, token })
  return _redis
}

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
    // 1. Validate userId
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // 3. Rate limiting: max 5 per user per hour (skip if Redis not configured or user is admin)
    const redis = await getRedis()
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress
    const isAdmin = email === 'nitishjain135@gmail.com'

    if (redis && !isAdmin) {
      try {
        const rateLimitKey = `script_limit:${userId}`
        const currentCount = await redis.incr(rateLimitKey)
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
      } catch {
        // Redis error — allow request through rather than breaking the route
        console.warn('[script/generate] Redis rate limit check failed — allowing request')
      }
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
