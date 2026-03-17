import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { addAiVideoCredits } from '@/lib/utils/aiVideoCredits'
import { deleteFile, generateVideoKey, generateThumbnailKey } from '@/lib/gcs/storage'
import type { ScriptSegment, SubtitleConfig } from '@/types'

// ── PATCH Schema ─────────────────────────────────────

const PatchSchema = z.object({
  title: z.string().max(100).optional(),
  platforms: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  subtitleConfig: z.record(z.unknown()).optional(),
  musicMood: z.string().optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  script: z
    .array(
      z.object({
        id: z.string(),
        order: z.number(),
        narration: z.string(),
        imagePrompt: z.string(),
        duration: z.number().optional(),
        audioUrl: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .optional(),
})

const EDITABLE_STATUSES = ['pending', 'ready', 'scheduled', 'failed']
const PROCESSING_STATUSES = ['generating_images', 'generating_voice', 'rendering']

// ── GET — Single Video ───────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        analytics: true,
        topicQueue: true,
      },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const script = video.script as unknown as ScriptSegment[] | null
    const subtitleConfig = video.subtitleConfig as unknown as SubtitleConfig

    return NextResponse.json({
      success: true,
      data: {
        ...video,
        script,
        subtitleConfig,
      },
    })
  } catch (error) {
    console.error('[video/GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── PATCH — Update Video ─────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Fetch and verify ownership
    const video = await prisma.video.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    if (!EDITABLE_STATUSES.includes(video.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot update video while in "${video.status}" status` },
        { status: 409 }
      )
    }

    // Build update object
    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.platforms !== undefined) updateData.platforms = data.platforms
    if (data.subtitleConfig !== undefined) updateData.subtitleConfig = data.subtitleConfig
    if (data.musicMood !== undefined) updateData.musicMood = data.musicMood
    if (data.musicVolume !== undefined) updateData.musicVolume = data.musicVolume
    if (data.script !== undefined) updateData.script = data.script as unknown as Record<string, unknown>[]

    // Handle scheduledAt
    if (data.scheduledAt !== undefined) {
      if (data.scheduledAt === null) {
        updateData.scheduledAt = null
        updateData.status = 'ready'
      } else {
        const scheduledDate = new Date(data.scheduledAt)
        if (scheduledDate > new Date()) {
          updateData.scheduledAt = scheduledDate
          updateData.status = 'scheduled'
        }
      }
    }

    const updated = await prisma.video.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[video/PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── DELETE — Delete Video ────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        imageUrls: true,
        script: true,
        masterAudioUrl: true,
        topicQueueId: true,
        generationMode: true,
      },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    if (PROCESSING_STATUSES.includes(video.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete video while processing' },
        { status: 409 }
      )
    }

    // Delete GCS files (fire and forget)

    const videoKey = generateVideoKey(userId, id)
    const thumbKey = generateThumbnailKey(userId, id)

    void deleteFile(videoKey).catch(() => { })
    void deleteFile(thumbKey).catch(() => { })

    // Delete images
    for (const url of video.imageUrls) {
      if (url) {
        const key = new URL(url).pathname.replace(/^\//, '')
        void deleteFile(key).catch(() => { })
      }
    }

    // Delete master audio
    if (video.masterAudioUrl) {
      try {
        const key = new URL(video.masterAudioUrl).pathname.replace(/^\//, '')
        void deleteFile(key).catch(() => { })
      } catch {
        // URL parse failure — skip
      }
    }

    // Reset TopicQueue if linked
    if (video.topicQueueId) {
      await prisma.topicQueue.update({
        where: { id: video.topicQueueId },
        data: { status: 'pending', videoId: null },
      }).catch(() => { })
    }

    // HARDENED REFUND LOGIC:
    // Only refund if:
    // 1. Status is 'failed' (system error)
    // 2. OR status is 'pending' AND no major assets were generated yet (prevent "browsing" exploit)
    const imagesCount = (video.imageUrls as string[] ?? []).length
    const hasGeneratedAssets = imagesCount > 0 || !!video.masterAudioUrl
    const isAiVideo = video.generationMode === 'ai_video'

    if (video.status === 'failed' || (video.status === 'pending' && !hasGeneratedAssets)) {
      if (isAiVideo) {
        await addAiVideoCredits(
          userId,
          1,
          'refund',
          'Video deleted/failed — AI credit returned'
        ).catch((e) => console.error('[video/DELETE] AI Refund failed:', e))
      } else {
        await addCredits(
          userId,
          1,
          'refund',
          'Video deleted/failed — credit returned'
        ).catch((e) => console.error('[video/DELETE] Refund failed:', e))
      }
    }

    // Delete video record (cascades to VideoAnalytics)
    await prisma.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[video/DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
