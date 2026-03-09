import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        // PostForMe should redirect back with the account params and standard state
        const error = searchParams.get('error')
        const userId = searchParams.get('state') // We passed user ID as state
        const platform = searchParams.get('platform')
        const accessToken = searchParams.get('access_token') // PostForMe returns the token or an ID
        const refreshToken = searchParams.get('refresh_token')
        const handle = searchParams.get('handle')
        const displayName = searchParams.get('display_name')
        const avatarUrl = searchParams.get('avatar_url')

        if (error) {
            return NextResponse.redirect(`${APP_URL}/platforms?error=${error}`)
        }

        if (!userId || !platform || !accessToken) {
            return NextResponse.redirect(`${APP_URL}/platforms?error=invalid_callback`)
        }

        // Upsert the platform connection directly
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
                accessToken,
                refreshToken: refreshToken ?? null,
                handle: handle ?? `${platform}_user`,
                displayName: displayName ?? handle ?? `${platform} User`,
                avatarUrl: avatarUrl ?? null,
            },
            update: {
                connected: true,
                accessToken,
                refreshToken: refreshToken ?? null,
                handle: handle ?? `${platform}_user`,
                displayName: displayName ?? handle ?? `${platform} User`,
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
