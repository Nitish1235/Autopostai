import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { enqueueJob } from '@/lib/queue/qstash'

// ── Schema ───────────────────────────────────────────

const TriggerSchema = z.object({
  videoId: z.string().min(1),
})

// ── POST — Trigger Render ────────────────────────────

export async function POST(request: Request) {
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
    const parsed = TriggerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { videoId } = parsed.data

    // Fetch video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        userId: true,
        status: true,
        script: true,
        imageUrls: true,
        subtitleConfig: true,
        musicMood: true,
        musicVolume: true,
        format: true,
        imageStyle: true,
      },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    if (video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Must be in 'ready' (re-render) or 'failed' (retry) status
    if (video.status !== 'ready' && video.status !== 'failed') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot trigger render: video is in "${video.status}" status`,
        },
        { status: 400 }
      )
    }

    // FIX #6: Check re-render attempt cap (max 3 per video)
    const MAX_RENDERS = 3
    const existingJob = await prisma.renderJob.findUnique({
      where: { videoId },
      select: { renderAttempts: true },
    })

    if (existingJob && existingJob.renderAttempts >= MAX_RENDERS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_RENDERS} render attempts reached for this video`,
        },
        { status: 429 }
      )
    }

    // Reset video status
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'rendering',
        errorMessage: null,
        videoUrl: null,
        thumbnailUrl: null,
        processingMs: null,
      },
    })

    // Reset RenderJob and increment attempt counter
    await prisma.renderJob.upsert({
      where: { videoId },
      create: {
        videoId,
        status: 'queued',
        stage: 'render',
        progress: 60,
        renderAttempts: 1,
      },
      update: {
        status: 'queued',
        stage: 'render',
        progress: 60,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        renderAttempts: { increment: 1 },
      },
    })

    // Add to render queue
    await enqueueJob('/api/jobs/render', {
      videoId,
      userId: userId,
      format: video.format,
      subtitleConfig: video.subtitleConfig as Record<string, unknown>,
      musicMood: video.musicMood,
      musicVolume: video.musicVolume,
      script: video.script as Record<string, unknown>[],
      imageUrls: video.imageUrls,
    }, {
      deduplicationId: `render-${videoId}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[render/trigger] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
