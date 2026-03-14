import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const POSTFORME_API_URL = 'https://api.postforme.dev/v1'
const POSTFORME_API_KEY = process.env.POSTFORME_API_KEY ?? ''

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

        // Use the APP_URL for the callback instead of hardcoding localhost
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        // Call PostForMe API to generate a platform-specific OAuth URL
        // We MUST pass state (userId) and our callback URL so PostForMe
        // knows where to send the user back after they authenticate on TikTok/Instagram.
        const response = await fetch(`${POSTFORME_API_URL}/social-accounts/auth-url`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${POSTFORME_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                platform,
                state: userId, // extremely important: returned to our callback
                redirect_url: `${APP_URL}/api/platforms/postforme/callback`
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`[auth] PostForMe API error:`, response.status, errorData)
            return NextResponse.json(
                { success: false, error: 'Failed to get platform auth URL' },
                { status: 502 }
            )
        }

        const data = await response.json()

        // PostForMe returns the direct platform OAuth URL
        const authUrl = data.url || data.auth_url || data.authUrl
        if (!authUrl) {
            console.error('[auth] PostForMe did not return an auth URL:', data)
            return NextResponse.json(
                { success: false, error: 'Invalid response from platform service' },
                { status: 502 }
            )
        }

        return NextResponse.json({
            success: true,
            data: { authUrl },
        })
    } catch (error) {
        console.error(`[auth] Error initializing OAuth flow:`, error)
        return NextResponse.json(
            { success: false, error: 'Failed to initialize platform connection' },
            { status: 500 }
        )
    }
}

