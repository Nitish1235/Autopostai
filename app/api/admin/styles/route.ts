import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'

// ── GET — List style previews ────────────────────────

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

        const previews = await prisma.adminStylePreview.findMany({
            where: isPublic ? { active: true } : {},
            orderBy: { order: 'asc' },
        })

        return NextResponse.json({ success: true, data: previews })
    } catch (error) {
        console.error('[admin/styles] GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── POST — Create/update style preview ───────────────

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
        const { styleId, imageUrl } = body

        if (!styleId || !imageUrl) {
            return NextResponse.json(
                { success: false, error: 'styleId and imageUrl are required' },
                { status: 400 }
            )
        }

        // Upsert — replace if already exists for this style
        const preview = await prisma.adminStylePreview.upsert({
            where: { styleId },
            create: { styleId, imageUrl },
            update: { imageUrl, updatedAt: new Date() },
        })

        return NextResponse.json({ success: true, data: preview })
    } catch (error) {
        console.error('[admin/styles] POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── DELETE — Remove style preview ────────────────────

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

        await prisma.adminStylePreview.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/styles] DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
