import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { getSegmentCount } from '@/lib/prompts/scriptPrompt'
import { addVideoToQueue } from '@/lib/queue/videoQueue'
import { isAdminEmail } from '@/lib/utils/credits'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const userEmail = session?.user?.email

    if (!userId || !isAdminEmail(userEmail)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin only' }, { status: 401 })
    }

    const testTopic = `Prod E2E Test Autopilot - ${new Date().getTime()}`

    // Helper to queue a test video
    const queueTest = async (mode: 'image_stack' | 'ai_video') => {
      const video = await prisma.video.create({
        data: {
          userId,
          topic: `${testTopic} (${mode})`,
          niche: 'finance',
          format: mode === 'ai_video' ? '10s' : '30s',
          imageStyle: 'cinematic',
          voiceId: 'ryan',
          voiceSpeed: 1.0,
          musicMood: 'motivational',
          musicVolume: 0.15,
          subtitleConfig: {},
          platforms: ['x'],
          scheduledAt: new Date(Date.now() + 60000), // scheduled 1 min from now
          status: 'pending',
          creditsUsed: 1,
          generationMode: mode,
          title: `${testTopic} (${mode})`.slice(0, 60),
        },
      })

      const segmentCount = getSegmentCount(video.format)
      await addVideoToQueue(
        video.id,
        userId,
        video.topic,
        video.niche as string,
        video.format,
        segmentCount,
        video.imageStyle,
        video.voiceId,
        1.0
      )

      return video.id
    }

    // Queue both pipeline variants
    const stackId = await queueTest('image_stack')
    const aiVideoId = await queueTest('ai_video')

    return NextResponse.json({
      success: true,
      message: 'Test videos successfully injected into pipeline. Check your user dashboard to view generation progress.',
      data: {
        imageStackVideoId: stackId,
        aiVideoId: aiVideoId,
      }
    })

  } catch (error) {
    console.error('[admin/trigger-autopilot-test] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error while injecting test videos.' },
      { status: 500 }
    )
  }
}
