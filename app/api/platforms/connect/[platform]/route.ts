import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const POSTFORME_API_URL = 'https://api.postforme.dev/v1'
const POSTFORME_API_KEY = process.env.POSTFORME_API_KEY ?? ''

export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

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

        const body = JSON.stringify({ 
            platform,
            // NOTE: redirect_url_override only works with your own OAuth credentials.
            // When using PostForMe's system credentials (default), you must set the
            // redirect URL in your PostForMe dashboard at https://app.postforme.dev
            // to point to: ${APP_URL}/api/platforms/postforme/callback
        })

        console.log(`[auth/${platform}] Requesting auth URL from PostForMe...`)

        const response = await fetch(`${POSTFORME_API_URL}/social-accounts/auth-url`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${POSTFORME_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body,
        })

        if (!response.ok) {
            let errorData: unknown = {}
            try { errorData = await response.json() } catch { /* empty */ }
            console.error(`[auth/${platform}] PostForMe API error ${response.status}:`, JSON.stringify(errorData))
            return NextResponse.json(
                { success: false, error: `Failed to get platform auth URL (HTTP ${response.status})` },
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
