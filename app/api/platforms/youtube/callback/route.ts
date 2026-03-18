import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { encryptToken } from '@/lib/utils/encryption'
import { exchangeYouTubeCode, getYouTubeChannelInfo } from '@/lib/api/youtube'
import { getDailyPostLimit, canAutoPost } from '@/lib/utils/plans'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// GET /api/platforms/youtube/callback?code=xxx&state=xxx
// Called by Google after user grants permission
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // User denied access
    if (error) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${APP_URL}/platforms?error=missing_code`)
    }

    // Require active session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/login?error=unauthorized_connection`)
    }

    // Exchange code → tokens
    let tokens
    try {
      tokens = await exchangeYouTubeCode(code)
    } catch (err) {
      console.error('[youtube/callback] Token exchange failed:', err)
      return NextResponse.redirect(`${APP_URL}/platforms?error=token_exchange_failed`)
    }

    // Fetch channel info (title, handle, thumbnail)
    let channelInfo
    try {
      channelInfo = await getYouTubeChannelInfo(tokens.accessToken)
    } catch (err) {
      console.error('[youtube/callback] Channel info failed:', err)
      return NextResponse.redirect(`${APP_URL}/platforms?error=channel_info_failed`)
    }

    // Look up plan for rate limits
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })
    const plan = userRecord?.plan ?? 'free'
    const planDailyLimit = getDailyPostLimit(plan)
    const autoPostEnabled = canAutoPost(plan)

    // Upsert PlatformConnection
    // accessToken  = encrypted Google access token (short-lived, ~1h)
    // refreshToken = encrypted Google refresh token (long-lived, use to refresh accessToken)
    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: 'youtube' } },
      create: {
        userId,
        platform: 'youtube',
        connected: true,
        accessToken: encryptToken(tokens.accessToken) ?? tokens.accessToken,
        refreshToken: encryptToken(tokens.refreshToken) ?? tokens.refreshToken,
        tokenExpiry: tokens.expiresAt,
        handle: channelInfo.handle,
        displayName: channelInfo.title,
        avatarUrl: channelInfo.thumbnailUrl,
        dailyLimit: planDailyLimit,
        autoPost: autoPostEnabled,
        // Store channelId in a stable field for analytics queries
        // We reuse the 'handle' field but also need channelId — store in displayName for now
        // TODO: add channelId column to schema if needed
      },
      update: {
        connected: true,
        accessToken: encryptToken(tokens.accessToken) ?? tokens.accessToken,
        refreshToken: encryptToken(tokens.refreshToken) ?? tokens.refreshToken,
        tokenExpiry: tokens.expiresAt,
        handle: channelInfo.handle,
        displayName: channelInfo.title,
        avatarUrl: channelInfo.thumbnailUrl,
        dailyLimit: planDailyLimit,
        autoPost: autoPostEnabled,
        updatedAt: new Date(),
      },
    })

    console.log(`[youtube/callback] Connected channel: ${channelInfo.title} (${channelInfo.handle}) for user ${userId}`)
    return NextResponse.redirect(`${APP_URL}/platforms?success=youtube`)
  } catch (error) {
    console.error('[youtube/callback] Unexpected error:', error)
    return NextResponse.redirect(`${APP_URL}/platforms?error=callback_failed`)
  }
}
