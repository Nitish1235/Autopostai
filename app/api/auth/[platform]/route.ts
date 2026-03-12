import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const POSTFORME_OAUTH_URL = 'https://dash.postforme.dev/oauth'
const POSTFORME_API_KEY = process.env.POSTFORME_API_KEY ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.redirect(`${APP_URL}/login?error=unauthorized`)
        }

        if (!POSTFORME_API_KEY) {
            console.error('Missing POSTFORME_API_KEY')
            return NextResponse.redirect(`${APP_URL}/platforms?error=missing_api_key`)
        }

        const { platform } = await params

        if (platform === 'youtube') {
            // Keep existing direct YouTube OAuth
            return NextResponse.redirect(`${APP_URL}/api/auth/youtube`)
        }

        // Build the PostForMe OAuth redirect URL
        // We pass our API key and tell it where to redirect back to.
        // The redirect URI must be configured in your PostForMe dashboard.
        const redirectUrl = new URL(POSTFORME_OAUTH_URL)
        redirectUrl.searchParams.append('api_key', POSTFORME_API_KEY)
        redirectUrl.searchParams.append('platform', platform)

        // Pass the user ID as 'state' so we know who is connecting when they return
        redirectUrl.searchParams.append('state', userId)

        // We assume the callback is handled centrally or via their webhook
        redirectUrl.searchParams.append('redirect_uri', `${APP_URL}/api/platforms/postforme/callback`)

        return NextResponse.redirect(redirectUrl.toString())
    } catch (error) {
        console.error(`[auth] Error initializing OAuth flow:`, error)
        return NextResponse.redirect(`${APP_URL}/platforms?error=auth_init_failed`)
    }
}
