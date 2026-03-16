import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { generateVoiceAndUpload } from '@/lib/api/unrealSpeech'
import type { ScriptSegment } from '@/types'

// ── Schema ───────────────────────────────────────────

const VoiceSchema = z.object({
  videoId: z.string(),
  segmentIndex: z.number().int().min(0),
  narration: z.string().min(5).max(500),
  voiceId: z.string(),
  voiceSpeed: z.number().min(0.75).max(1.5),
})

// ── POST — Regenerate Voice for Segment ──────────────

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
    const parsed = VoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { videoId, segmentIndex, narration, voiceId, voiceSpeed } = parsed.data

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, script: true },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    const script = video.script as unknown as ScriptSegment[]
    if (!script || segmentIndex >= script.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid segment index' },
        { status: 400 }
      )
    }

    // Generate voice and upload to GCS
    const result = await generateVoiceAndUpload({
      text: narration,
      voiceId,
      speed: voiceSpeed,
      userId: userId,
      videoId,
    })

    // Update segment in Video.script JSON
    const updatedScript = script.map((seg, idx) => {
      if (idx === segmentIndex) {
        return {
          ...seg,
          narration,
          audioUrl: result.gcsUrl,
          wordTimestamps: result.words,
          duration: result.duration,
        }
      }
      return seg
    })

    await prisma.video.update({
      where: { id: videoId },
      data: {
        script: updatedScript as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        audioUrl: result.gcsUrl,
        duration: result.duration,
        words: result.words,
      },
    })
  } catch (error) {
    console.error('[voice/generate] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
