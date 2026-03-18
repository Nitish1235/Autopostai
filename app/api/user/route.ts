import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { isAdminEmail } from '@/lib/utils/credits'

// ── GET — Fetch current user ──────────────────────────

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        credits: true,
        creditsUsed: true,
        creditsReset: true,
        aiVideoCredits: true,
        aiVideoCreditsUsed: true,
        defaultNiche: true,
        defaultVoiceId: true,
        defaultStyle: true,
        defaultFormat: true,
        channelName: true,
        notifyVideoReady: true,
        notifyVideoPosted: true,
        notifyMilestone: true,
        notifyWeeklyReport: true,
        notifyTrendAlert: true,
        notifyCreditLow: true,
        createdAt: true,
        platformConnections: {
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
          },
        },
        autopilotConfig: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        isAdmin: isAdminEmail(user.email),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── PATCH — Update user preferences ──────────────────

const updateUserSchema = z.object({
  defaultNiche: z.string().optional(),
  defaultVoiceId: z.string().optional(),
  defaultStyle: z.string().optional(),
  defaultFormat: z.string().optional(),
  channelName: z.string().max(50).optional(),
  notifyVideoReady: z.boolean().optional(),
  notifyVideoPosted: z.boolean().optional(),
  notifyMilestone: z.boolean().optional(),
  notifyWeeklyReport: z.boolean().optional(),
  notifyTrendAlert: z.boolean().optional(),
  notifyCreditLow: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          message: parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join(', '),
        },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      include: {
        platformConnections: true,
        autopilotConfig: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        isAdmin: isAdminEmail(updatedUser.email),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
