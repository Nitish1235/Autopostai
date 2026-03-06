import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'

// ── GET — List voice previews ────────────────────────

export async function GET(req: NextRequest) {
    try {
        const isPublic = req.nextUrl.searchParams.get('public') === 'true'

        if (!isPublic) {
            const isAdmin = await isAdminAuthenticated()
            if (!isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized' },
                    { status: 401 }
                )
            }
        }

        const previews = await prisma.adminVoicePreview.findMany({
            where: isPublic ? { active: true } : {},
        })

        return NextResponse.json({ success: true, data: previews })
    } catch (error) {
        console.error('[admin/voices] GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── POST — Create/update voice preview ───────────────

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await req.json()
        const { voiceId, audioUrl } = body

        if (!voiceId || !audioUrl) {
            return NextResponse.json(
                { success: false, error: 'voiceId and audioUrl are required' },
                { status: 400 }
            )
        }

        // Upsert — replace if already exists for this voice
        const preview = await prisma.adminVoicePreview.upsert({
            where: { voiceId },
            create: { voiceId, audioUrl },
            update: { audioUrl, updatedAt: new Date() },
        })

        return NextResponse.json({ success: true, data: preview })
    } catch (error) {
        console.error('[admin/voices] POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── DELETE — Remove voice preview ────────────────────

export async function DELETE(req: NextRequest) {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await req.json()
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            )
        }

        await prisma.adminVoicePreview.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/voices] DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
