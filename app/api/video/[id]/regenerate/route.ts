import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { generateImage } from '@/lib/api/runware'
import { generateVoiceAndUpload } from '@/lib/api/unrealSpeech'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'
import { buildImagePrompt } from '@/lib/prompts/imagePrompt'
import { NEGATIVE_PROMPT } from '@/lib/utils/constants'
import axios from 'axios'
import type { ScriptSegment } from '@/types'

// ── Schema ───────────────────────────────────────────

const RegenerateSchema = z.object({
  type: z.enum(['image', 'voice']),
  segmentIndex: z.number().int().min(0),
  imagePrompt: z.string().optional(),
  narration: z.string().optional(),
})

const MAX_REGENERATIONS = 10

// ── POST — Regenerate Segment ────────────────────────

export async function POST(
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

    const { id: videoId } = await params
    const body = await request.json()
    const parsed = RegenerateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, segmentIndex, imagePrompt, narration } = parsed.data

    // Fetch video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        userId: true,
        status: true,
        script: true,
        imageUrls: true,
        imageStyle: true,
        voiceId: true,
        voiceSpeed: true,
        creditsUsed: true,
      },
    })

    if (!video || video.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      )
    }

    // FIX #7: Only allow regeneration if video is in an editable state
    const REGENERATABLE = ['ready', 'failed']
    if (!REGENERATABLE.includes(video.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot regenerate while video is in "${video.status}" status` },
        { status: 409 }
      )
    }

    const script = video.script as unknown as ScriptSegment[]
    if (!script || segmentIndex >= script.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid segment index' },
        { status: 400 }
      )
    }

    // Rate limit: max regenerations per video
    const regenerationCount = await prisma.creditTransaction.count({
      where: {
        videoId,
        type: 'usage',
        description: { startsWith: 'Regeneration' },
      },
    })

    if (regenerationCount >= MAX_REGENERATIONS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_REGENERATIONS} regenerations per video reached` },
        { status: 429 }
      )
    }


    const segment = script[segmentIndex]

    if (type === 'image') {
      // Build prompt
      const prompt = imagePrompt
        ? buildImagePrompt(imagePrompt, video.imageStyle)
        : buildImagePrompt(segment.imagePrompt, video.imageStyle)

      // Generate image
      const result = await generateImage({
        positivePrompt: prompt,
        negativePrompt: NEGATIVE_PROMPT,
        width: 1024,
        height: 1792,
        seed: Date.now() % 1000000,
      })

      // Download and upload to GCS
      const imgResponse = await axios.get(result.imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })
      const imgBuffer = Buffer.from(imgResponse.data)

      const gcsKey = generateSegmentKey(userId, videoId, 'image', segmentIndex, 'webp')
      const gcsUrl = await uploadBuffer(imgBuffer, gcsKey, 'image/webp')

      // Update imageUrls array
      const currentUrls = [...video.imageUrls]
      while (currentUrls.length <= segmentIndex) currentUrls.push('')
      currentUrls[segmentIndex] = gcsUrl

      await prisma.video.update({
        where: { id: videoId },
        data: { imageUrls: currentUrls },
      })

      // Track regeneration for per-video limit enforcement
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'usage',
          credits: 0,
          description: `Regeneration: image segment ${segmentIndex}`,
          videoId,
          balanceAfter: video.creditsUsed,
        },
      })

      return NextResponse.json({
        success: true,
        data: { imageUrl: gcsUrl },
      })
    }

    if (type === 'voice') {
      const text = narration ?? segment.narration

      const result = await generateVoiceAndUpload({
        text,
        voiceId: video.voiceId,
        speed: video.voiceSpeed,
        userId,
        videoId,
      })

      // Update script segment
      const updatedScript = script.map((seg, idx) => {
        if (idx === segmentIndex) {
          return {
            ...seg,
            narration: text,
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

      // Track regeneration for per-video limit enforcement
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'usage',
          credits: 0,
          description: `Regeneration: voice segment ${segmentIndex}`,
          videoId,
          balanceAfter: video.creditsUsed,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          audioUrl: result.gcsUrl,
          duration: result.duration,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[video/regenerate] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
