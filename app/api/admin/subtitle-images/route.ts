import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'

// ── GET — List subtitle preview images ──────────────────────
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

        const images = await prisma.adminSubtitlePreview.findMany({
            where: isPublic ? { active: true } : {},
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: images })
    } catch (error) {
        console.error('[admin/subtitle-images] GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── POST — Create subtitle preview image ────────────────────
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
        const { imageUrl, isDefault } = body

        if (!imageUrl) {
            return NextResponse.json(
                { success: false, error: 'imageUrl is required' },
                { status: 400 }
            )
        }

        // If this one is set as default, unset others
        if (isDefault) {
            await prisma.adminSubtitlePreview.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            })
        }

        const currentCount = await prisma.adminSubtitlePreview.count()

        const image = await prisma.adminSubtitlePreview.create({
            data: {
                imageUrl,
                isDefault: isDefault ?? (currentCount === 0), // First one is default automatically
            },
        })

        return NextResponse.json({ success: true, data: image })
    } catch (error) {
        console.error('[admin/subtitle-images] POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ── DELETE — Remove subtitle preview image ──────────────────
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

        await prisma.adminSubtitlePreview.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/subtitle-images] DELETE error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
