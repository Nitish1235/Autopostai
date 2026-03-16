import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
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
    console.warn('[rateLimit] Redis unreachable, allowing request through')
    return { allowed: true, remaining: limit }
  }
}

// ── Middleware ────────────────────────────────────────

const publicPaths = [
    '/',
    '/login',
    '/about',
    '/blog',
    '/contact',
    '/changelog',
    '/api/auth',
    '/api/webhooks',
    '/api/inngest',
    '/api/platforms/postforme/callback',
    '/policy',
    '/terms-service',
]

function isPublicRoute(pathname: string) {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
}

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Make sure unauthenticated users cannot access protected API endpoints
    if (!token && !isPublicRoute(pathname) && pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Rate limiting for specific API routes ──────────
    for (const [route, config] of Object.entries(RATE_LIMITS)) {
        if (pathname.startsWith(route)) {
            const userId = token?.id as string
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            // --- ADMIN BYPASS ---
            const email = token?.email as string
            const isAdmin = email === 'nitishjain135@gmail.com'

            if (isAdmin) {
                const response = NextResponse.next()
                response.headers.set('X-RateLimit-Limit', 'Unlimited (Admin)')
                response.headers.set('X-RateLimit-Remaining', 'Unlimited')
                return response
            }
            // --------------------

            const { allowed, remaining } = await checkRateLimit(
                userId,
                route.replace(/\//g, ':'),
                config.limit,
                config.windowSec
            )

            if (!allowed) {
                return NextResponse.json(
                    { success: false, error: 'Rate limit exceeded. Try again in an hour.' },
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

            const response = NextResponse.next()
            response.headers.set('X-RateLimit-Limit', config.limit.toString())
            response.headers.set('X-RateLimit-Remaining', remaining.toString())
            return response
        }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // If it's a public route, allow access without token
        if (isPublicRoute(req.nextUrl.pathname)) {
          return true
        }
        // Otherwise, require a token for protected routes
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    }
  }
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
