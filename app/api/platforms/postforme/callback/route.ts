import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { getDailyPostLimit, canAutoPost } from '@/lib/utils/plans'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const POSTFORME_API_URL = 'https://api.postforme.dev/v1'
const POSTFORME_API_KEY = process.env.POSTFORME_API_KEY ?? ''

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        // PostForMe redirects back after OAuth with these params:
        // provider = platform name (e.g. 'instagram')
        // accountIds = the PostForMe social account ID (e.g. 'spc_xxx')
        // isSuccess = 'true' on success
        const error = searchParams.get('error')
        // PostForMe sends 'provider' (not 'platform')
        const platform = searchParams.get('platform') || searchParams.get('provider')
        // PostForMe sends 'accountIds' — the spc_ social account ID
        const socialAccountId =
            searchParams.get('accountIds') ||
            searchParams.get('social_account_id') ||
            searchParams.get('account_id') ||
            searchParams.get('id')
        const isSuccess = searchParams.get('isSuccess')

        // Require an active Clerk session (user must be logged in)
        const session = await getServerSession(authOptions)
    const userId = session?.user?.id

        if (!userId) {
            console.error('[postforme/callback] Unauthenticated callback attempt')
            return NextResponse.redirect(`${APP_URL}/login?error=unauthorized_connection`)
        }

        if (error) {
            return NextResponse.redirect(`${APP_URL}/platforms?error=${error}`)
        }

        if (!platform || !socialAccountId || isSuccess === 'false') {
            console.error('[postforme/callback] Missing or failed params:', {
                platform: !!platform,
                socialAccountId: !!socialAccountId,
                isSuccess,
                allParams: Object.fromEntries(searchParams.entries()),
            })
            return NextResponse.redirect(`${APP_URL}/platforms?error=invalid_callback`)
        }

        // Fetch account details from PostForMe API using the socialAccountId.
        // The callback URL params only give us the ID — we need to call the API for username/photo.
        // SocialAccountDto shape: { id, platform, username, profile_photo_url, status, ... }
        let username: string | null = null
        let avatarUrl: string | null = null

        try {
            const accountRes = await fetch(
                `${POSTFORME_API_URL}/social-accounts?id=${encodeURIComponent(socialAccountId)}`,
                {
                    headers: {
                        Authorization: `Bearer ${POSTFORME_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
            if (accountRes.ok) {
                const accountData = await accountRes.json()
                // Response shape: { data: [...], meta: { ... } }
                const account = accountData.data?.[0]
                if (account) {
                    username = account.username ?? null
                    avatarUrl = account.profile_photo_url ?? null
                }
            } else {
                console.warn('[postforme/callback] Could not fetch account details:', accountRes.status)
            }
        } catch (fetchErr) {
            console.warn('[postforme/callback] Error fetching account details:', fetchErr)
        }

        // Look up user's plan to set the correct dailyLimit
        const userRecord = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true },
        })
        const plan = userRecord?.plan ?? 'free'
        const planDailyLimit = getDailyPostLimit(plan)
        const autoPostEnabled = canAutoPost(plan)

        // Upsert the platform connection.
        // We store the PostForMe social account ID (spc_xxx) in the accessToken field
        // since PostForMe manages the actual OAuth tokens internally.
        // dailyLimit is set to the user's plan limit — not a hardcoded value.
        await prisma.platformConnection.upsert({
            where: {
                userId_platform: {
                    userId,
                    platform,
                },
            },
            create: {
                userId,
                platform,
                connected: true,
                accessToken: socialAccountId, // PostForMe social account ID used for publishing
                handle: username ?? `${platform}_user`,
                displayName: username ?? `${platform} User`,
                avatarUrl: avatarUrl ?? null,
                dailyLimit: planDailyLimit,
                autoPost: autoPostEnabled,
            },
            update: {
                connected: true,
                accessToken: socialAccountId,
                handle: username ?? `${platform}_user`,
                displayName: username ?? `${platform} User`,
                avatarUrl: avatarUrl ?? null,
                // Only update dailyLimit on reconnect if it exceeds plan max
                // (plan downgrade protection — don't let stale limit exceed new plan)
                dailyLimit: planDailyLimit,
                autoPost: autoPostEnabled,
                updatedAt: new Date(),
            },
        })

        return NextResponse.redirect(`${APP_URL}/platforms?success=${platform}`)
    } catch (error) {
        console.error('[postforme/callback] Error:', error)
        return NextResponse.redirect(`${APP_URL}/platforms?error=callback_failed`)
    }
}
