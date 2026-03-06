import { NextRequest, NextResponse } from 'next/server'
import {
    validateAdminCredentials,
    createAdminToken,
    ADMIN_COOKIE,
    TOKEN_MAX_AGE,
} from '@/lib/admin/auth'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password are required' },
                { status: 400 }
            )
        }

        if (!validateAdminCredentials(username, password)) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        const token = createAdminToken()

        const response = NextResponse.json({ success: true })
        response.cookies.set(ADMIN_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: TOKEN_MAX_AGE,
            path: '/',
        })

        return response
    } catch {
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
