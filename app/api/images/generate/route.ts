import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { generateImage } from '@/lib/api/runware'
import { getModelForStyle } from '@/lib/api/runware'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'
import {
  buildImagePrompt,
  NEGATIVE_PROMPT,
  STYLE_NEGATIVES,
} from '@/lib/prompts/imagePrompt'
import axios from 'axios'

// ── Request Schema ───────────────────────────────────
const schema = z.object({
  videoId: z.string(),
  segmentIndex: z.number().int().min(0),
  imagePrompt: z.string().min(10),
  imageStyle: z.string(),
})

// ── POST /api/images/generate ────────────────────────
// Regenerate ONE image for a specific segment
// (from the Script Editor step).

export async function POST(request: NextRequest) {
  try {
    // 1. Validate userId
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }



    // 2. Validate input
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { videoId, segmentIndex, imagePrompt, imageStyle } = parsed.data

    // 3. Validate ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, imageUrls: true },
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

    // 4. Build full prompt
    const seed = Math.floor(Math.random() * 2147483647)
    const fullPrompt = buildImagePrompt(imagePrompt, imageStyle, seed)
    const styleNegative = STYLE_NEGATIVES[imageStyle] ?? ''
    const fullNegativePrompt = styleNegative
      ? `${NEGATIVE_PROMPT}, ${styleNegative}`
      : NEGATIVE_PROMPT

    // 5. Generate image
    const result = await generateImage({
      positivePrompt: fullPrompt,
      negativePrompt: fullNegativePrompt,
      width: 1024,
      height: 1792,
      seed,
      model: getModelForStyle(imageStyle),
    })

    // 6. Download and upload to GCS
    const imageResponse = await axios.get(result.imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })
    const imageBuffer = Buffer.from(imageResponse.data)

    const gcsKey = generateSegmentKey(
      userId,
      videoId,
      'image',
      segmentIndex,
      'webp'
    )
    const gcsUrl = await uploadBuffer(imageBuffer, gcsKey, 'image/webp')

    // 7. Update Video.imageUrls at segmentIndex
    const currentUrls = video.imageUrls ?? []
    const newUrls = [...currentUrls]
    while (newUrls.length <= segmentIndex) {
      newUrls.push('')
    }
    newUrls[segmentIndex] = gcsUrl

    await prisma.video.update({
      where: { id: videoId },
      data: { imageUrls: newUrls },
    })

    return NextResponse.json({
      success: true,
      data: { imageUrl: gcsUrl },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/images/generate] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
