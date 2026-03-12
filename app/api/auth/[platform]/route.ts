import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const POSTFORME_OAUTH_URL = 'https://app.postforme.dev/oauth'
const POSTFORME_API_KEY = process.env.POSTFORME_API_KEY ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!POSTFORME_API_KEY) {
            console.error('Missing POSTFORME_API_KEY')
            return NextResponse.json(
                { success: false, error: 'Platform connection is not configured' },
                { status: 500 }
            )
        }

        const { platform } = await params

        // All platforms (tiktok, instagram, youtube, x) go through PostForMe
        const redirectUrl = new URL(POSTFORME_OAUTH_URL)
        redirectUrl.searchParams.append('api_key', POSTFORME_API_KEY)
        redirectUrl.searchParams.append('platform', platform)
        redirectUrl.searchParams.append('state', userId)
        redirectUrl.searchParams.append('redirect_uri', `${APP_URL}/api/platforms/postforme/callback`)

        return NextResponse.json({
            success: true,
            data: { authUrl: redirectUrl.toString() },
        })
    } catch (error) {
        console.error(`[auth] Error initializing OAuth flow:`, error)
        return NextResponse.json(
            { success: false, error: 'Failed to initialize platform connection' },
            { status: 500 }
        )
    }
}
