import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'

// ── GET — List music tracks ──────────────────────────

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

        const tracks = await prisma.adminMusicTrack.findMany({
            where: isPublic ? { active: true } : {},
            orderBy: [{ mood: 'asc' }, { createdAt: 'desc' }],
        })

        return NextResponse.json({ success: true, data: tracks })
    } catch (error) {
        console.error('[admin/music] GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── POST — Create music track ────────────────────────

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
        const { name, mood, fileUrl, duration } = body

        if (!name || !mood || !fileUrl) {
            return NextResponse.json(
                { success: false, error: 'Name, mood, and fileUrl are required' },
                { status: 400 }
            )
        }

        const track = await prisma.adminMusicTrack.create({
            data: {
                name,
                mood,
                fileUrl,
                duration: duration ?? null,
            },
        })

        return NextResponse.json({ success: true, data: track })
    } catch (error) {
        console.error('[admin/music] POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── DELETE — Remove music track ──────────────────────

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

        await prisma.adminMusicTrack.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/music] DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
