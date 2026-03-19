import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { isAdminUser } from '@/lib/utils/credits'
import { addVideoToQueue, addAiVideoToQueue } from '@/lib/queue/videoQueue'

const bulkSchema = z.object({
  topics: z.array(z.string().min(1)).min(1),
  generationMode: z.enum(['image_stack', 'ai_video']),
  skipAudio: z.boolean().default(false),
  imageStyle: z.string().default('cinematic'),
  niche: z.string().default('General'),
  section: z.string().default('carousel'),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Must be admin
    const isAdmin = await isAdminUser(userId)
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin only.' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = bulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { topics, generationMode, skipAudio, imageStyle, niche, section } = parsed.data

    let enqueuedCount = 0

    // Enqueue each topic as a separate video
    for (const topic of topics) {
      // 1. Create the video record in the DB
      // We pass isShowcase and skipAudio so the workers know what to do
      const video = await prisma.video.create({
        data: {
          userId,
          title: topic.substring(0, 60),
          topic,
          niche,
          format: '15s', // 12-15 secondary requirement
          imageStyle,
          generationMode,
          isShowcase: true,
          adminSection: section,
          skipAudio: skipAudio,
          status: 'pending',
          aiAudioMode: skipAudio ? 'keep_ai' : 'replace',
        },
      })

      // 2. Add to QStash workers
      if (generationMode === 'ai_video') {
        await addAiVideoToQueue(video.id, {
          videoId: video.id,
          userId,
          topic,
          niche,
          imageStyle,
          format: '15s',
          aiAudioMode: skipAudio ? 'keep_ai' : 'replace',
          skipAudio,
          isShowcase: true,
        })
      } else {
        await addVideoToQueue(
          video.id,
          userId,
          topic,
          niche,
          '15s',
          3, // ~3-4 images for 15s
          imageStyle,
          'none', // voiceId is irrelevant since we skip audio
          1.0,
          undefined,
          skipAudio,
          true // isShowcase
        )
      }

      enqueuedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Enqueued ${enqueuedCount} showcase videos for generation.`,
    })
  } catch (error) {
    console.error('[admin/showcase-bulk] Error processing bulk showcase:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
