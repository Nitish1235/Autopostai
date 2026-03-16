import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const SAFE_SELECT = {
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
} as const

const connectSchema = z.object({
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'x']),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  handle: z.string(),
  displayName: z.string().optional(),
})

export async function POST(req: Request) {
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
    const parsed = connectSchema.safeParse(body)

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

    const { platform, accessToken, refreshToken, handle, displayName } =
      parsed.data

    // Token expiry: 60 days from now
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 60)

    const connection = await prisma.platformConnection.upsert({
      where: {
        userId_platform: {
          userId: userId,
          platform,
        },
      },
      create: {
        userId: userId,
        platform,
        handle,
        displayName: displayName ?? handle,
        accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiry,
        connected: true,
      },
      update: {
        handle,
        displayName: displayName ?? handle,
        accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiry,
        connected: true,
      },
    })

    // Re-query with safe fields only — never return tokens to client
    const safeConnection = await prisma.platformConnection.findUnique({
      where: { id: connection.id },
      select: SAFE_SELECT,
    })

    return NextResponse.json({
      success: true,
      data: safeConnection,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
