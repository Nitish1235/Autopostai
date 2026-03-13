import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { deductCredit, addCredits } from '@/lib/utils/credits'
import { checkAiVideoCredits, deductAiVideoCredit } from '@/lib/utils/aiVideoCredits'
import { addVideoToQueue, addAiVideoToQueue } from '@/lib/queue/videoQueue'
import { getSegmentCount } from '@/lib/prompts/scriptPrompt'
import { inngest } from '@/lib/inngest/client'

// ── Request Schema ───────────────────────────────────
const schema = z.object({
  topic: z.string().min(10).max(500),
  niche: z.string(),
  format: z.enum(['30s', '60s', '90s']),
  imageStyle: z.string(),
  voiceId: z.string(),
  voiceSpeed: z.number().min(0.75).max(1.5),
  musicMood: z.string(),
  musicVolume: z.number().min(0).max(1),
  subtitleConfig: z.object({
    font: z.enum(['Montserrat', 'Roboto', 'Inter', 'Proxima Nova', 'Bangers', 'Komika', 'The Bold Font', 'Oswald', 'Playfair Display']),
    fontSize: z.number().min(10).max(200),
    primaryColor: z.string(),
    activeColor: z.string(),
    spokenColor: z.string(),
    firstWordAccent: z.boolean(),
    accentColor: z.string(),
    strokeColor: z.string(),
    strokeWidth: z.number(),
    backgroundBox: z.boolean(),
    bgColor: z.string(),
    bgOpacity: z.number().min(0).max(1),
    bgRadius: z.number(),
    shadow: z.boolean(),
    glow: z.boolean(),
    animation: z.enum(['none', 'pop', 'fade', 'slide_up', 'slide_down', 'typewriter', 'spring', 'bounce', 'karoke', 'zoom_in']),
    animationDuration: z.number().min(0).max(1),
    position: z.number().min(0).max(100),
    alignment: z.enum(['left', 'center', 'right']),
    maxWordsPerLine: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    uppercase: z.boolean(),
  }),
  platforms: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime().optional(),
  generationMode: z.enum(['image_stack', 'ai_video']).default('image_stack'),
  aiAudioMode: z.enum(['keep_ai', 'replace']).optional(),
  script: z
    .array(
      z.object({
        id: z.string(),
        order: z.number(),
        narration: z.string(),
        imagePrompt: z.string(),
        estimatedDuration: z.number().optional(),
      })
    )
    .optional(),
})

// ── POST /api/video/create ───────────────────────────
// Main entry point. User has reviewed script, selected
// voice, style, subtitles. Now they hit "Generate".

export async function POST(request: NextRequest) {
  try {
    // 1. Validate userId
    const { userId } = await auth()
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
      console.error('[API/Video/Create] Zod Validation Failed:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const {
      topic,
      niche,
      format,
      imageStyle,
      voiceId,
      voiceSpeed,
      musicMood,
      musicVolume,
      subtitleConfig,
      platforms,
      scheduledAt,
      generationMode,
      aiAudioMode,
      script: providedScript,
    } = parsed.data

    const isAiVideo = generationMode === 'ai_video'

    // 3. Deduct credit upfront (different pool per mode)
    // FIX #4: Credit deducted BEFORE video record is created to eliminate the race
    // condition where a video exists in DB but no credit was charged.
    try {
      if (isAiVideo) {
        const { hasCredits } = await checkAiVideoCredits(userId)
        if (!hasCredits) {
          return NextResponse.json(
            {
              success: false,
              error: 'No AI video credits remaining. Upgrade your plan.',
            },
            { status: 402 }
          )
        }
        await deductAiVideoCredit(userId, 'pending', 'AI Video generation')
      } else {
        await deductCredit(userId, 'video-pending', 'Video generation')
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits. Please upgrade or purchase more credits.',
        },
        { status: 402 }
      )
    }

    // 4. Create Video record in DB
    let video
    try {
      video = await prisma.video.create({
        data: {
          userId,
          topic,
          niche,
          format,
          imageStyle,
          voiceId,
          voiceSpeed,
          musicMood,
          musicVolume,
          subtitleConfig: subtitleConfig as any,
          platforms,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'pending',
          creditsUsed: 1,
          generationMode,
          aiAudioMode: isAiVideo ? (aiAudioMode ?? 'keep_ai') : null,
          script: !isAiVideo && providedScript
            ? (providedScript as any)
            : undefined,
          imageUrls: [],
          title: topic.slice(0, 60),
        },
      })
    } catch (err) {
      // Refund credit since video creation failed
      if (!isAiVideo) {
        await addCredits(userId, 1, 'refund', 'Video creation failed — credit returned')
      }
      throw err
    }

    // 5. Route to appropriate queue
    try {
      if (isAiVideo) {
        await addAiVideoToQueue(video.id, {
          videoId: video.id,
          userId,
          topic,
          niche,
          imageStyle,
          format,
          aiAudioMode: aiAudioMode ?? 'keep_ai',
          voiceId: aiAudioMode === 'replace' ? voiceId : undefined,
          voiceSpeed: aiAudioMode === 'replace' ? voiceSpeed : undefined,
          musicMood: aiAudioMode === 'replace' ? musicMood : undefined,
          musicVolume: aiAudioMode === 'replace' ? musicVolume : undefined,
          subtitleConfig: aiAudioMode === 'replace' ? subtitleConfig : undefined,
        })
      } else {
        // Create RenderJob record
        await prisma.renderJob.create({
          data: {
            videoId: video.id,
            status: 'queued',
            stage: 'script',
            progress: 0,
          },
        })

        const segmentCount = getSegmentCount(format)
        // FIX #3: Pass user-edited script so the worker skips re-generation
        await addVideoToQueue(
          video.id,
          userId,
          topic,
          niche,
          format,
          segmentCount,
          imageStyle,
          voiceId,
          voiceSpeed,
          providedScript ?? undefined
        )
      }
    } catch (err) {
      // Clean up: delete video + renderJob, refund credit
      await prisma.renderJob.deleteMany({ where: { videoId: video.id } })
      await prisma.video.delete({ where: { id: video.id } })
      await addCredits(userId, 1, 'refund', 'Video queue failed — credit returned')
      throw err
    }

    // 8. Send Inngest event (non-blocking)
    try {
      await inngest.send({
        name: 'video/created',
        data: { videoId: video.id, userId },
      })
    } catch {
      // Inngest event failure should not block video creation
    }

    // 9. Return video ID
    return NextResponse.json({
      success: true,
      data: { videoId: video.id },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/video/create] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
