import { auth } from '@/lib/auth/authOptions'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// ── Rate Limit Configuration ─────────────────────────

const RATE_LIMITS: Record<string, { limit: number; windowSec: number }> = {
  '/api/script/generate': { limit: 5, windowSec: 3600 },
  '/api/video/create': { limit: 10, windowSec: 3600 },
  '/api/images/generate': { limit: 20, windowSec: 3600 },
  '/api/publish': { limit: 10, windowSec: 3600 },
}

// ── Redis Rate Limiter (Upstash SDK — atomic pipeline) ──

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

async function checkRateLimit(
  userId: string,
  routeName: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedis()
  if (!client) {
    return { allowed: true, remaining: limit }
  }

  const key = `ratelimit:${userId}:${routeName}`

  try {
    // Pipeline: INCR + EXPIRE in single atomic round-trip
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, windowSec)

    const results = await pipeline.exec()
    const count = results[0] as number

    if (count > limit) {
      return { allowed: false, remaining: 0 }
    }

    return { allowed: true, remaining: limit - count }
  } catch {
    // Fail OPEN — allow request when Redis is down to prevent blocking logins
    console.warn('[rateLimit] Redis unreachable, allowing request through')
    return { allowed: true, remaining: limit }
  }
}

// ── Middleware ────────────────────────────────────────

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = (request as unknown as { auth: { user?: { id?: string } } | null }).auth

  // ── Public routes (skip auth) ──────────────────────
  const publicPaths = [
    '/',
    '/login',
    '/about',
    '/blog',
    '/contact',
    '/changelog',
    '/admin',
    '/api/auth',
    '/api/webhooks',
    '/api/inngest',
    '/_next',
    '/favicon.ico',
    '/logo',
    '/images',
    '/videos',
    '/policy',
    '/terms-service',
  ]

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (isPublic) {
    return NextResponse.next()
  }

  // ── Auth check ─────────────────────────────────────
  if (!session?.user?.id) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Rate limiting for specific API routes ──────────
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(route)) {
      const { allowed, remaining } = await checkRateLimit(
        session.user.id,
        route.replace(/\//g, ':'),
        config.limit,
        config.windowSec
      )

      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded. Try again in an hour.',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'Retry-After': config.windowSec.toString(),
            },
          }
        )
      }

      // Add rate limit headers to response
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', config.limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      return response
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
