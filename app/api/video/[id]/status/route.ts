import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import type { ScriptSegment } from '@/types'

// ── GET /api/video/[id]/status ───────────────────────
// Polling endpoint for video generation progress.
// Called every 3 seconds from the Preview step.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validate session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params
    const userId = session.user.id

    // 2. Fetch video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        userId: true,
        status: true,
        script: true,
        imageUrls: true,
        videoUrl: true,
        thumbnailUrl: true,
        errorMessage: true,
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
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Fetch RenderJob
    const renderJob = await prisma.renderJob.findUnique({
      where: { videoId },
      select: {
        stage: true,
        progress: true,
      },
    })

    // 4. Parse script to count segments
    const script = video.script as unknown as ScriptSegment[] | null
    const totalSegments = script?.length ?? 0

    // 5. Count completed images
    const imagesComplete = (video.imageUrls ?? []).filter(
      (url) => !!url && url.length > 0
    ).length

    // 6. Count completed voice segments
    const voiceComplete = script
      ? script.filter((seg) => !!seg.audioUrl && seg.audioUrl.length > 0).length
      : 0

    // 7. Calculate overall progress
    let progress = 0
    switch (video.status) {
      case 'pending':
        progress = 0
        break
      case 'generating_script':
        progress = 10
        break
      case 'generating_images':
      case 'generating_voice': {
        const imageProgress =
          totalSegments > 0 ? (imagesComplete / totalSegments) * 30 : 0
        const voiceProgress =
          totalSegments > 0 ? (voiceComplete / totalSegments) * 20 : 0
        progress = Math.round(20 + imageProgress + voiceProgress)
        break
      }
      case 'rendering':
        progress = 75
        break
      case 'ready':
      case 'scheduled':
      case 'posted':
        progress = 100
        break
      case 'failed':
        progress = -1
        break
      default:
        progress = 0
    }

    return NextResponse.json({
      success: true,
      data: {
        status: video.status,
        stage: renderJob?.stage ?? null,
        progress,
        imagesComplete,
        voiceComplete,
        totalSegments,
        videoUrl: video.videoUrl ?? null,
        thumbnailUrl: video.thumbnailUrl ?? null,
        error: video.errorMessage ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/video/status] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
