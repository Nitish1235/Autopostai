import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        // PostForMe redirects back with account info after OAuth
        const error = searchParams.get('error')
        const platform = searchParams.get('platform')
        // PostForMe returns the social account ID — this is what we use for publishing
        const socialAccountId = searchParams.get('social_account_id') || searchParams.get('account_id') || searchParams.get('id')
        const username = searchParams.get('username') || searchParams.get('handle')
        const displayName = searchParams.get('display_name') || searchParams.get('name')
        const avatarUrl = searchParams.get('avatar_url') || searchParams.get('profile_image_url')

        // We need to identify which user this callback belongs to.
        // PostForMe may return a state param if we passed one, otherwise
        // we look for it in the referrer or a cookie.
        const userId = searchParams.get('state')

        if (error) {
            return NextResponse.redirect(`${APP_URL}/platforms?error=${error}`)
        }

        if (!userId || !platform || !socialAccountId) {
            console.error('[postforme/callback] Missing params:', {
                userId: !!userId,
                platform: !!platform,
                socialAccountId: !!socialAccountId,
                allParams: Object.fromEntries(searchParams.entries()),
            })
            return NextResponse.redirect(`${APP_URL}/platforms?error=invalid_callback`)
        }

        // Upsert the platform connection
        // We store the PostForMe social_account_id in the accessToken field
        // since PostForMe manages the actual OAuth tokens internally
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
                accessToken: socialAccountId, // PostForMe social account ID
                handle: username ?? `${platform}_user`,
                displayName: displayName ?? username ?? `${platform} User`,
                avatarUrl: avatarUrl ?? null,
            },
            update: {
                connected: true,
                accessToken: socialAccountId, // PostForMe social account ID
                handle: username ?? `${platform}_user`,
                displayName: displayName ?? username ?? `${platform} User`,
                avatarUrl: avatarUrl ?? null,
                updatedAt: new Date(),
            },
        })

        return NextResponse.redirect(`${APP_URL}/platforms?success=${platform}`)
    } catch (error) {
        console.error('[postforme/callback] Error:', error)
        return NextResponse.redirect(`${APP_URL}/platforms?error=callback_failed`)
    }
}

