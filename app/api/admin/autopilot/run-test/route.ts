import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import { isAdminEmail } from '@/lib/utils/credits'
import { getDailyPostLimit } from '@/lib/utils/plans'
import { getSegmentCount } from '@/lib/prompts/scriptPrompt'
import { addVideoToQueue } from '@/lib/queue/videoQueue'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email

    if (!userEmail || !isAdminEmail(userEmail)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin only' }, { status: 401 })
    }

    // Default target for test
    const targetEmail = 'nitishjain135@gmail.com'
    
    // 1. Find the user and their autopilot config
    const config = await prisma.autopilotConfig.findFirst({
      where: { user: { email: targetEmail } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            credits: true,
            aiVideoCredits: true,
            plan: true,
          },
        },
      },
    })

    if (!config) {
      return NextResponse.json({ success: false, error: `AutopilotConfig not found for ${targetEmail}` })
    }

    const conf = config as any
    const logs: string[] = []
    logs.push(`🚀 Starting Functional Test for ${targetEmail}`)
    
    // 1b. CHECK: Basic Status
    if (!conf.enabled) {
      logs.push('❌ Autopilot is DISABLED for this user.')
      return NextResponse.json({ success: true, logs, status: 'disabled' })
    }
    if (conf.consecutiveFailures >= 3) {
      logs.push(`⚠️ CRITICAL: User has ${conf.consecutiveFailures} consecutive failures! Cron would skip them.`)
    }

    // 1c. CHECK: Credits
    const credits = conf.user.credits || 0
    const aiCredits = conf.user.aiVideoCredits || 0
    logs.push(`💳 Credits: ${credits} (Standard), ${aiCredits} (AI Video)`)
    if (credits <= 0 && conf.generationMode !== 'ai_video') {
      logs.push('❌ NO CREDITS LEFT. Skipping.')
      return NextResponse.json({ success: true, logs, status: 'no_credits' })
    }

    // 1d. CHECK: Duplicate Run Lock (This Hour)
    const hourStart = new Date()
    hourStart.setUTCMinutes(0, 0, 0)
    const alreadyFiredThisHour = await prisma.video.count({
      where: {
        userId: conf.userId,
        topicQueueId: { not: null },
        createdAt: { gte: hourStart },
      },
    })
    if (alreadyFiredThisHour > 0) {
      logs.push(`🔒 ALREADY FIRED ${alreadyFiredThisHour} times this hour. Cron would check this lock.`)
    } else {
      logs.push('🔓 No videos created this hour yet.')
    }
    const now = new Date()
    const timeZone = conf.timezone || 'UTC'
    const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })
    const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' })
    const currentHour = parseInt(formatterHour.format(now), 10)
    const currentDay = formatterDay.format(now).toLowerCase()

    let schedule: any
    try {
      schedule = typeof conf.schedule === 'string' ? JSON.parse(conf.schedule) : conf.schedule
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse schedule JSON' })
    }

    const todaySlots = schedule[currentDay] || []
    const matchingSlots = todaySlots.filter((slot: any) => {
      if (!slot.enabled) return false
      const slotHour = parseInt(slot.time.split(':')[0], 10)
      return slotHour === currentHour
    })

    if (matchingSlots.length === 0) {
      logs.push(`⚠️ NOT SCHEDULED for this hour (${currentHour}:00 on ${currentDay}).`)
      logs.push(`   Available slots today: ${todaySlots.filter((s:any) => s.enabled).map((s:any) => s.time).join(', ') || 'None'}`)
    } else {
      logs.push(`✅ SCHEDULE MATCHED! Slots: ${matchingSlots.map((s:any) => s.platform).join(', ')}`)
    }

    // 3. CHECK: Daily Posting Limit
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayPostCount = await prisma.video.count({
      where: {
        userId: conf.userId,
        createdAt: { gte: todayStart },
        status: { not: 'failed' },
      },
    })

    const isAdmin = isAdminEmail(conf.user.email)
    const planMax = isAdmin ? 100 : Number(getDailyPostLimit(conf.user.plan))
    const effectiveDailyMax = Math.min(conf.postsPerDay || 1, planMax)
    
    logs.push(`📊 Daily Limit: ${todayPostCount} / ${effectiveDailyMax}`)
    if (todayPostCount >= effectiveDailyMax && !isAdmin) {
      logs.push('⚠️ DAILY LIMIT REACHED. Skipping video creation.')
      return NextResponse.json({ success: true, logs, status: 'limit_reached' })
    }

    // 4. Topic Selection
    const topic = await prisma.topicQueue.findFirst({
      where: { userId: conf.userId, status: 'pending' },
      orderBy: { order: 'asc' },
    })

    if (!topic) {
      logs.push('⚠️ No pending topics in queue.')
      return NextResponse.json({ success: true, logs, status: 'no_topics' })
    }
    logs.push(`📝 Selected topic: "${topic.topic}"`)

    // 5. Create Video record
    const generationMode = conf.generationMode || 'image_stack'
    const platforms = matchingSlots.length > 0 ? matchingSlots.map((s:any) => s.platform) : ['tiktok']

    const video = await prisma.video.create({
      data: {
        userId: conf.userId,
        topic: topic.topic,
        niche: conf.niche,
        format: conf.format,
        imageStyle: conf.imageStyle,
        voiceId: conf.voiceId,
        musicMood: conf.musicMood,
        musicVolume: 0.15,
        subtitleConfig: (conf.subtitleConfig as any) ?? {},
        platforms,
        scheduledAt: new Date(), 
        status: 'pending',
        creditsUsed: 1,
        generationMode: generationMode as any,
        title: `TEST: ${topic.topic}`.slice(0, 60),
        topicQueueId: topic.id,
      },
    })

    logs.push(`✅ Video ${video.id} created and queued for rendering.`)

    // 6. Queue for processing
    const segmentCount = getSegmentCount(conf.format)
    await addVideoToQueue(
      video.id,
      conf.userId,
      topic.topic,
      conf.niche,
      conf.format,
      segmentCount,
      conf.imageStyle,
      conf.voiceId,
      1.0
    )

    // 7. Mark topic as generating
    await prisma.topicQueue.update({
      where: { id: topic.id },
      data: { status: 'generating', videoId: video.id },
    })

    return NextResponse.json({
      success: true,
      logs,
      message: 'Autopilot functional test complete. Check worker logs for rendering.',
      videoId: video.id
    })

  } catch (error) {
    console.error('[api/admin/autopilot/run-test] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
