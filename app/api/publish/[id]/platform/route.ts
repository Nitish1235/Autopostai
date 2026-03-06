import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { publishQueue } from '@/lib/queue/videoQueue'

// ── Schema ───────────────────────────────────────────

const PlatformSchema = z.object({
    platform: z.enum(['tiktok', 'instagram', 'youtube', 'x']),
})

// ── POST — Publish to a single platform ──────────────
// No credit deduction, no daily limit check.
// Used for retries and posting to additional platforms.

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id: videoId } = await params
        const body = await request.json()
        const parsed = PlatformSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid platform' },
                { status: 400 }
            )
        }

        const { platform } = parsed.data

        // 1. Fetch video
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                userId: true,
                status: true,
                videoUrl: true,
                publishedPlatforms: true,
                platformStatuses: true,
            },
        })

        if (!video || video.userId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Video not found' },
                { status: 404 }
            )
        }

        // 2. Validate status
        if (video.status !== 'ready' && video.status !== 'posted') {
            return NextResponse.json(
                { success: false, error: `Cannot publish video in '${video.status}' status` },
                { status: 400 }
            )
        }

        if (!video.videoUrl) {
            return NextResponse.json(
                { success: false, error: 'Video has no media URL' },
                { status: 400 }
            )
        }

        // 3. Check not already posted
        if (video.publishedPlatforms.includes(platform)) {
            return NextResponse.json(
                { success: false, error: `Already posted to ${platform}` },
                { status: 409 }
            )
        }

        // 4. Check user has active connection
        const connection = await prisma.platformConnection.findFirst({
            where: {
                userId: session.user.id,
                platform,
                connected: true,
            },
            select: { id: true, accessToken: true },
        })

        if (!connection?.accessToken) {
            return NextResponse.json(
                { success: false, error: `No active ${platform} connection` },
                { status: 400 }
            )
        }

        // 5. Update platformStatuses to 'pending'
        const statuses = (video.platformStatuses as Record<string, string>) ?? {}
        statuses[platform] = 'pending'

        await prisma.video.update({
            where: { id: videoId },
            data: { platformStatuses: statuses },
        })

        // 6. Add to publish queue (single platform)
        await publishQueue.add(`publish-${videoId}-${platform}-retry`, {
            videoId,
            userId: session.user.id,
            platforms: [platform],
        })

        return NextResponse.json({
            success: true,
            queued: true,
            platform,
        })
    } catch (error) {
        console.error('[publish/platform] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
