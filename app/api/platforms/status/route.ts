import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

// ── Health Status Type ───────────────────────────────

type HealthStatus = 'healthy' | 'expiring' | 'expired' | 'disconnected' | 'throttled'

// ── GET — All Platform Connection Statuses ───────────

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const connections = await prisma.platformConnection.findMany({
      where: { userId: userId },
    })

    const now = new Date()

    const statuses = connections.map((conn) => {
      const tokenExpiry = conn.tokenExpiry ? new Date(conn.tokenExpiry) : null
      const isExpired = tokenExpiry ? tokenExpiry < now : false
      const daysUntilExpiry = tokenExpiry
        ? Math.ceil((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Compute health status
      let healthStatus: HealthStatus = 'healthy'
      if (!conn.connected) {
        healthStatus = 'disconnected'
      } else if (conn.throttleActive) {
        healthStatus = 'throttled'
      } else if (isExpired) {
        healthStatus = 'expired'
      } else if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
        healthStatus = 'expiring'
      }

      return {
        id: conn.id,
        platform: conn.platform,
        connected: conn.connected,
        displayName: conn.displayName,
        handle: conn.handle,
        avatarUrl: conn.avatarUrl,
        followerCount: conn.followerCount,
        autoPost: conn.autoPost,
        dailyLimit: conn.dailyLimit,
        postWindow: conn.postWindow,
        tokenExpiry: conn.tokenExpiry,
        isExpired,
        daysUntilExpiry,
        healthStatus,
        throttleActive: conn.throttleActive,
        lastPostAt: conn.lastPostAt,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }
    })

    return NextResponse.json({ success: true, data: statuses })
  } catch (error) {
    console.error('[platforms/status] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
