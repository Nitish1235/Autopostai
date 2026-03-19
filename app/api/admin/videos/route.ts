import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'

// ── GET — List showcase videos ───────────────────────

export async function GET(req: NextRequest) {
    try {
        const isPublic = req.nextUrl.searchParams.get('public') === 'true'
        const section = req.nextUrl.searchParams.get('section')

        if (!isPublic) {
            const isAdmin = await isAdminAuthenticated()
            if (!isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized' },
                    { status: 401 }
                )
            }
        }

        const whereClause: any = {}
        if (isPublic) whereClause.active = true
        if (section) whereClause.section = section

        const videos = await prisma.adminShowcaseVideo.findMany({
            where: whereClause,
            orderBy: { order: 'asc' },
        })

        return NextResponse.json({ success: true, data: videos })
    } catch (error) {
        console.error('[admin/videos] GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── POST — Create showcase video ─────────────────────

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
        const { title, niche, views, likes, videoUrl, thumbnailUrl, gradient, section } = body

        if (!title || !niche) {
            return NextResponse.json(
                { success: false, error: 'Title and niche are required' },
                { status: 400 }
            )
        }

        // Get next order number
        const maxOrder = await prisma.adminShowcaseVideo.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true },
        })

        const video = await prisma.adminShowcaseVideo.create({
            data: {
                section: section ?? 'carousel',
                title,
                niche,
                views: views ?? '0',
                likes: likes ?? '0',
                videoUrl: videoUrl ?? null,
                thumbnailUrl: thumbnailUrl ?? null,
                gradient: gradient ?? 'from-emerald-600/50 to-teal-800/50',
                order: (maxOrder?.order ?? -1) + 1,
            },
        })

        return NextResponse.json({ success: true, data: video })
    } catch (error) {
        console.error('[admin/videos] POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── DELETE — Remove showcase video ───────────────────

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

        await prisma.adminShowcaseVideo.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/videos] DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
