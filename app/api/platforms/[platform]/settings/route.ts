import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

const VALID_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x']

// ── Schema ───────────────────────────────────────────

const SettingsSchema = z.object({
  autoPost: z.boolean().optional(),
  dailyLimit: z.number().int().min(1).max(10).optional(),
  postWindow: z
    .string()
    .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Format: HH:MM-HH:MM')
    .optional(),
})

// ── PATCH — Update Platform Settings ─────────────────

export async function PATCH(
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

    const { platform } = await params

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { success: false, error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = SettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Find connection
    const connection = await prisma.platformConnection.findUnique({
      where: {
        userId_platform: {
          userId: userId,
          platform,
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { success: false, error: `Platform "${platform}" is not connected` },
        { status: 404 }
      )
    }

    // Build update
    const updateData: Record<string, unknown> = {}
    if (parsed.data.autoPost !== undefined) updateData.autoPost = parsed.data.autoPost
    if (parsed.data.dailyLimit !== undefined) updateData.dailyLimit = parsed.data.dailyLimit
    if (parsed.data.postWindow !== undefined) updateData.postWindow = parsed.data.postWindow

    const updated = await prisma.platformConnection.update({
      where: {
        userId_platform: {
          userId: userId,
          platform,
        },
      },
      data: updateData,
      select: {
        id: true,
        platform: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        followerCount: true,
        connected: true,
        autoPost: true,
        dailyLimit: true,
        postWindow: true,
        lastPostAt: true,
        lastPostStatus: true,
        shadowbanRisk: true,
        throttleActive: true,
        monthlyViews: true,
        monthlyPosts: true,
        tokenExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[platforms/settings] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
