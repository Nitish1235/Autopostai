import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/authOptions'
import { Redis } from '@upstash/redis'

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy_token',
})

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

// ── GET — Initiate YouTube OAuth ─────────────────────

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const redirectUri = `${APP_URL}/api/auth/youtube/callback`

    // Generate unpredictable CSRF token
    const csrfToken = crypto.randomUUID() + crypto.randomUUID()

    // Store userId keyed by token, expire in 10 minutes
    await redis.set(`youtube_oauth:${csrfToken}`, session.user.id, { ex: 600 })

    const params = new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: csrfToken,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({
      success: true,
      data: { authUrl },
    })
  } catch (error) {
    console.error('[auth/youtube] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
