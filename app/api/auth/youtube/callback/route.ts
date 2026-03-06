import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { Redis } from '@upstash/redis'

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? ''
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ── Helper: Exchange Code for Tokens ─────────────────

async function getYouTubeTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
}> {
  const redirectUri = `${APP_URL}/api/auth/youtube/callback`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

// ── Helper: Get Channel Info ─────────────────────────

async function getChannelInfo(accessToken: string): Promise<{
  handle: string
  title: string
  thumbnailUrl: string
  subscriberCount: number
}> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch YouTube channel info')
  }

  const data = (await response.json()) as {
    items: Array<{
      snippet: {
        customUrl: string
        title: string
        thumbnails: { default: { url: string } }
      }
      statistics: { subscriberCount: string }
    }>
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('No YouTube channel found')
  }

  const channel = data.items[0]

  return {
    handle: channel.snippet.customUrl ?? '',
    title: channel.snippet.title,
    thumbnailUrl: channel.snippet.thumbnails.default.url,
    subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
  }
}

// ── GET — YouTube OAuth Callback ─────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const csrfToken = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=youtube_denied`)
    }

    if (!code || !csrfToken) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=youtube_invalid`)
    }

    // Verify CSRF token and look up userId from Redis
    const userId = await redis.get<string>(`youtube_oauth:${csrfToken}`)
    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=state_expired`)
    }

    // Delete token immediately — one-time use
    await redis.del(`youtube_oauth:${csrfToken}`)

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=youtube_invalid_user`)
    }

    // Exchange code for tokens
    const tokens = await getYouTubeTokens(code)

    // Fetch channel info
    const channel = await getChannelInfo(tokens.accessToken)

    // Upsert PlatformConnection
    await prisma.platformConnection.upsert({
      where: {
        userId_platform: {
          userId,
          platform: 'youtube',
        },
      },
      create: {
        userId,
        platform: 'youtube',
        connected: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        handle: channel.handle,
        displayName: channel.title,
        avatarUrl: channel.thumbnailUrl,
        followerCount: channel.subscriberCount,
      },
      update: {
        connected: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        handle: channel.handle,
        displayName: channel.title,
        avatarUrl: channel.thumbnailUrl,
        followerCount: channel.subscriberCount,
      },
    })

    return NextResponse.redirect(`${APP_URL}/platforms?success=youtube`)
  } catch (error) {
    console.error('[auth/youtube/callback] Error:', error)
    return NextResponse.redirect(`${APP_URL}/platforms?error=youtube_failed`)
  }
}
