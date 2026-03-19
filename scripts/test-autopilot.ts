import { prisma } from '../lib/db/prisma'
import { deductCredit, isAdminEmail } from '../lib/utils/credits'
import { deductAiVideoCredit } from '../lib/utils/aiVideoCredits'
import { addVideoToQueue } from '../lib/queue/videoQueue'
import { getSegmentCount } from '../lib/prompts/scriptPrompt'
import { getDailyPostLimit } from '../lib/utils/plans'

async function testAutopilot(targetEmail: string = 'nitishjain135@gmail.com') {
  console.log('🚀 Starting Autopilot Functional Test...')
  console.log(`📧 Target User: ${targetEmail}`)

  try {
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
      console.error(`❌ No AutopilotConfig found for email: ${targetEmail}`)
      return
    }

    const conf = config as any // Bypass local type mismatches

    if (!conf.enabled) {
      console.warn(`⚠️ Autopilot is DISABLED for this user.`)
    }

    if (conf.consecutiveFailures >= 3) {
      console.error(`❌ CRITICAL: This user has ${conf.consecutiveFailures} consecutive failures. Autopilot would normally skip them!`)
    }

    console.log(`✅ Config found for ID: ${conf.userId}`)
    console.log(`   Mode: ${conf.generationMode}, Niche: ${conf.niche}, Format: ${conf.format}`)

    // 2. CHECK: Schedule Validation
    console.log('\n📅 Checking Schedule Logic...')
    const now = new Date()
    const timeZone = conf.timezone || 'UTC'

    const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })
    const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' })

    const currentHour = parseInt(formatterHour.format(now), 10)
    const currentDay = formatterDay.format(now).toLowerCase()

    let schedule: any
    try {
      schedule = typeof config.schedule === 'string' ? JSON.parse(config.schedule) : config.schedule
    } catch {
      console.error('❌ Failed to parse schedule JSON')
      return
    }

    const todaySlots = schedule[currentDay] || []
    const matchingSlots = todaySlots.filter((slot: any) => {
      if (!slot.enabled) return false
      const slotHour = parseInt(slot.time.split(':')[0], 10)
      return slotHour === currentHour
    })

    if (matchingSlots.length === 0) {
      console.warn(`⚠️ NOT SCHEDULED for this hour (${currentHour}:00 on ${currentDay}).`)
      console.log('   Available slots today:', todaySlots.filter((s:any) => s.enabled).map((s:any) => s.time).join(', ') || 'None')
    } else {
      console.log(`✅ SCHEDULE MATCHED! Target platforms: ${matchingSlots.map((s:any) => s.platform).join(', ')}`)
    }

    // 3. CHECK: Daily Posting Limit
    console.log('\n📊 Checking Daily Limits...')
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
    
    console.log(`   Posted today: ${todayPostCount} / ${effectiveDailyMax} (Limit)`)
    if (todayPostCount >= effectiveDailyMax && !isAdmin) {
      console.warn('⚠️ DAILY LIMIT REACHED. Autopilot would skip this user.')
    } else {
      console.log('✅ Daily limit check passed.')
    }

    // 4. Topic Selection & Replenishment Check
    console.log('\n📝 Checking Topics...')
    const pendingCount = await prisma.topicQueue.count({
      where: { userId: conf.userId, status: 'pending' },
    })

    if (pendingCount < 3) {
      console.warn(`⚠️ LOW TOPICS (${pendingCount} pending). Autopilot would trigger 'topics/generate'.`)
    } else {
      console.log(`✅ Topic count healthy (${pendingCount} pending).`)
    }

    const topic = await prisma.topicQueue.findFirst({
      where: {
        userId: conf.userId,
        status: 'pending',
      },
      orderBy: { order: 'asc' },
    })

    if (!topic) {
      console.warn('⚠️ No pending topics in queue for this user.')
      return
    }
    console.log(`✅ Selected topic: "${topic.topic}"`)

    // 5. Create Video record
    console.log('\n🎬 Creating video record...')
    const generationMode = config.generationMode || 'image_stack'
    const isAiVideo = generationMode === 'ai_video'
    const platforms = matchingSlots.length > 0 ? matchingSlots.map((s:any) => s.platform) : ['tiktok']

    const video = await prisma.video.create({
      data: {
        userId: config.userId,
        topic: topic.topic,
        niche: config.niche,
        format: config.format,
        imageStyle: config.imageStyle,
        voiceId: config.voiceId,
        musicMood: config.musicMood,
        musicVolume: 0.15,
        subtitleConfig: (config.subtitleConfig as any) ?? {},
        platforms,
        scheduledAt: new Date(), 
        status: 'pending',
        creditsUsed: 1,
        generationMode: generationMode as any,
        title: `TEST: ${topic.topic}`.slice(0, 60),
        topicQueueId: topic.id,
      },
    })

    console.log(`✅ Video created: ${video.id}`)

    // 6. Queue for processing
    console.log('📡 Enqueuing for rendering...')
    const segmentCount = getSegmentCount(config.format)
    await addVideoToQueue(
      video.id,
      config.userId,
      topic.topic,
      config.niche,
      config.format,
      segmentCount,
      config.imageStyle,
      config.voiceId,
      1.0
    )

    // 7. Mark topic as generating
    await prisma.topicQueue.update({
      where: { id: topic.id },
      data: {
        status: 'generating',
        videoId: video.id,
      },
    })

    console.log('\n--- TEST FLOW COMPLETE ---')
    console.log(`Video ID: ${video.id}`)
    console.log('The script verified schedule logic, limits, and successfully enqueued the job.')
    console.log('Check your logs now for rendering progress.')
    console.log('---------------------------')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run it
const userIdArg = process.argv[2]
testAutopilot(userIdArg)
