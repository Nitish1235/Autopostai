import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const disconnectSchema = z.object({
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'x']),
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
    const parsed = disconnectSchema.safeParse(body)

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

    const { platform } = parsed.data

    await prisma.platformConnection.update({
      where: {
        userId_platform: {
          userId: userId,
          platform,
        },
      },
      data: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${platform} disconnected successfully`,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to disconnect platform'
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
