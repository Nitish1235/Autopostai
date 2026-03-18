import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { getDailyPostLimit, clampDailyLimit } from '@/lib/utils/plans'
import { isAdminEmail } from '@/lib/utils/credits'

const VALID_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x']

// ── Schema ───────────────────────────────────────────
// Note: dailyLimit max is enforced server-side per plan (not fixed at 10)

const SettingsSchema = z.object({
  autoPost: z.boolean().optional(),
  dailyLimit: z.number().int().min(1).max(10).optional(), // hard cap at 10, plan cap applied below
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
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
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

    // Fetch user plan for limit enforcement
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, email: true },
    })
    const isAdmin = isAdminEmail(userRecord?.email)
    const plan = userRecord?.plan ?? 'free'
    const planMax = isAdmin ? 50 : getDailyPostLimit(plan)

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

    // Free users cannot enable autoPost or set any dailyLimit (Bypass for admin)
    if (plan === 'free' && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Auto-posting requires a paid plan. Upgrade to Starter or above.',
          planRequired: 'starter',
        },
        { status: 403 }
      )
    }

    // Build update — clamp dailyLimit to plan max
    const updateData: Record<string, unknown> = {}
    if (parsed.data.autoPost !== undefined) updateData.autoPost = parsed.data.autoPost
    if (parsed.data.dailyLimit !== undefined) {
      // Silently clamp to plan max — don't let users exceed their tier
      updateData.dailyLimit = isAdmin ? parsed.data.dailyLimit : clampDailyLimit(parsed.data.dailyLimit, plan)
    }
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

    return NextResponse.json({
      success: true,
      data: updated,
      planMax,  // return plan max so UI can update slider without a page refresh
    })
  } catch (error) {
    console.error('[platforms/settings] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
