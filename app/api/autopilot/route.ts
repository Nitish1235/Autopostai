import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'

// ── PUT Schema ───────────────────────────────────────

const UpdateSchema = z.object({
  enabled: z.boolean().optional(),
  niche: z.string().optional(),
  format: z.enum(['15s', '30s', '60s', '90s']).optional(),
  postsPerDay: z.number().int().min(1).max(24).optional(),
  imageStyle: z.string().optional(),
  voiceId: z.string().optional(),
  musicMood: z.string().optional(),
  approvalMode: z.enum(['review', 'autopilot']).optional(),
  schedule: z
    .record(
      z.array(
        z.object({
          time: z.string(),
          platform: z.string(),
          enabled: z.boolean(),
        })
      )
    )
    .optional(),
  subtitleConfig: z.record(z.unknown()).optional(),
  aiOptimizeTime: z.boolean().optional(),
  generationMode: z.enum(['image_stack', 'ai_video']).optional(),
  timezone: z.string().optional(),
})

// ── GET — Get Autopilot Config ───────────────────────

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

    let config = await prisma.autopilotConfig.findUnique({
      where: { userId: userId },
    })

    // Create default if not exists
    if (!config) {
      config = await prisma.autopilotConfig.create({
        data: {
          userId: userId,
          schedule: {
            monday: [{ time: '18:00', platform: 'x', enabled: true }],
            tuesday: [{ time: '18:00', platform: 'x', enabled: true }],
            wednesday: [{ time: '18:00', platform: 'x', enabled: true }],
            thursday: [{ time: '18:00', platform: 'x', enabled: true }],
            friday: [{ time: '18:00', platform: 'x', enabled: true }],
            saturday: [{ time: '12:00', platform: 'x', enabled: true }],
            sunday: [{ time: '12:00', platform: 'x', enabled: true }],
          },
        },
      })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[autopilot/GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── PUT — Update Autopilot Config ────────────────────

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Build update payload
    const updateData: Record<string, unknown> = {}
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.niche !== undefined) updateData.niche = data.niche
    if (data.format !== undefined) updateData.format = data.format
    if (data.postsPerDay !== undefined) updateData.postsPerDay = data.postsPerDay
    if (data.imageStyle !== undefined) updateData.imageStyle = data.imageStyle
    if (data.voiceId !== undefined) updateData.voiceId = data.voiceId
    if (data.musicMood !== undefined) updateData.musicMood = data.musicMood
    if (data.approvalMode !== undefined) updateData.approvalMode = data.approvalMode
    if (data.schedule !== undefined) updateData.schedule = data.schedule
    if (data.subtitleConfig !== undefined) updateData.subtitleConfig = data.subtitleConfig
    if (data.aiOptimizeTime !== undefined) updateData.aiOptimizeTime = data.aiOptimizeTime
    if (data.generationMode !== undefined) updateData.generationMode = data.generationMode
    if (data.timezone !== undefined) updateData.timezone = data.timezone

    const config = await prisma.autopilotConfig.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        ...updateData,
      } as any, // Typed as any to bypass local prisma client sync issues
      update: updateData,
    })

    // If enabling: check topic queue and trigger topic generation if needed
    if (data.enabled === true) {
      const pendingTopics = await prisma.topicQueue.count({
        where: { userId: userId, status: 'pending' },
      })

      if (pendingTopics < 3) {
        const niche = data.niche ?? config.niche
        try {
          await inngest.send({
            name: 'topics/generate',
            data: {
              userId: userId,
              niche,
              count: 10,
            },
          })
        } catch {
          // Non-critical
        }
      }

      // Set nextRunAt to next scheduled slot
      await prisma.autopilotConfig.update({
        where: { userId: userId },
        data: {
          nextRunAt: getNextScheduledTime(config.schedule as Record<string, unknown[]>),
        },
      })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[autopilot/PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Helper: Get Next Scheduled Time ──────────────────

function getNextScheduledTime(schedule: Record<string, any[]>): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const now = new Date()
  const currentDay = now.getUTCDay()

  // Check the next 7 days
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (currentDay + offset) % 7
    const dayName = days[dayIndex]
    const slots = (schedule as any)[dayName] as Array<{ time: string; enabled: boolean }> | undefined

    if (!slots) continue

    // Sort slots by time to find earliest future slot
    const sortedSlots = [...slots].filter(s => s.enabled).sort((a, b) => a.time.localeCompare(b.time))

    for (const slot of sortedSlots) {
      const [hours, minutes] = slot.time.split(':').map(Number)
      const candidate = new Date(now)
      candidate.setUTCDate(candidate.getUTCDate() + offset)
      candidate.setUTCHours(hours, minutes, 0, 0)

      if (candidate > now) {
        return candidate
      }
    }
  }

  // Default: tomorrow at 18:00 UTC
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(18, 0, 0, 0)
  return tomorrow
}
