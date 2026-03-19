/**
 * test-autopilot.ts
 * 
 * E2E test script to validate Autopilot timezone resolution 
 * and end-to-end video generation triggers for both 
 * `image_stack` and `ai_video`.
 * 
 * Run with: npx ts-node scripts/test-autopilot.ts
 */

import { PrismaClient } from '@prisma/client'
import { getSegmentCount } from '../lib/prompts/scriptPrompt'
import { addVideoToQueue } from '../lib/queue/videoQueue'

const prisma = new PrismaClient()

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testTimezoneResolution(timezone: string) {
  console.log('\n=============================================')
  console.log('🧪 TEST 1: TIMEZONE RESOLUTION LOGIC')
  console.log('=============================================')
  
  const now = new Date()
  console.log(`System UTC Time: ${now.toISOString()}`)
  console.log(`Target Timezone: ${timezone}`)

  const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' })
  const formatterMin = new Intl.DateTimeFormat('en-US', { timeZone: timezone, minute: 'numeric' })
  const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' })

  const currentHour = parseInt(formatterHour.format(now), 10)
  const currentMin = parseInt(formatterMin.format(now), 10)
  const currentDayName = formatterDay.format(now).toLowerCase()

  console.log(`\n✅ Resolved User Local Time:`)
  console.log(`- Day: ${currentDayName}`)
  console.log(`- Hour: ${currentHour}`)
  console.log(`- Minute: ${currentMin}`)
  
  if (isNaN(currentHour) || !currentDayName) {
    throw new Error('❌ Timezone resolution failed! Intl logic is faulty.')
  }
}

async function runVideoGenerationTest(userId: string, generationMode: 'image_stack' | 'ai_video') {
  console.log('\n=============================================')
  console.log(`🧪 TEST 2: Triggering ${generationMode.toUpperCase()} generation`)
  console.log('=============================================')

  const testTopic = `E2E Test Autopilot - ${generationMode} - ${new Date().getTime()}`

  // 1. Create mock video record
  const video = await prisma.video.create({
    data: {
      userId,
      topic: testTopic,
      niche: 'finance',
      format: generationMode === 'ai_video' ? '15s' : '30s',
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
      generationMode,
      title: testTopic.slice(0, 60),
    },
  })

  console.log(`✅ Created DB Video Tracking Record: ${video.id}`)

  // 2. Queue for processing
  const segmentCount = getSegmentCount(video.format)
  await addVideoToQueue(
    video.id,
    userId,
    testTopic,
    video.niche as string,
    video.format,
    segmentCount,
    video.imageStyle,
    video.voiceId,
    1.0
  )

  console.log(`✅ Injected into VideoQueue. Polling for completion...`)

  // 3. Poll status
  let attempts = 0
  const MAX_POLLS = 100 // 100 * 5s = ~8 minutes timeout

  while (attempts < MAX_POLLS) {
    attempts++
    await sleep(5000)

    const check = await prisma.video.findUnique({
      where: { id: video.id },
      select: { status: true, platformStatuses: true, errorMessage: true }
    })

    if (!check) {
      console.log('❌ Video record disappeared from DB!')
      break
    }

    const stage = (check.platformStatuses as any)?.stage || check.status
    process.stdout.write(`\r[Attempt ${attempts}/${MAX_POLLS}] Status: ${check.status} | Stage: ${stage}          `)

    if (check.status === 'ready' || check.status === 'scheduled') {
      console.log(`\n🎉 SUCCESS! ${generationMode} Video Pipeline completed perfectly!`)
      return true
    }

    if (check.status === 'failed') {
      console.log(`\n❌ FAILED! Pipeline crashed with error: ${check.errorMessage}`)
      return false
    }
  }

  console.log(`\n❌ TIMEOUT! Pipeline took too long to complete.`)
  return false
}

async function main() {
  console.log('Starting Autopilot E2E Test Suite...')

  // Step 1: Find a valid user to test with
  const user = await prisma.user.findFirst({
    where: { credits: { gt: 10 } }
  })

  if (!user) {
    console.log('❌ Cannot test: No users found with > 10 credits.')
    process.exit(1)
  }

  console.log(`Using Test User ID: ${user.id} (${user.email || 'No email'})`)

  // Run Tests
  try {
    // 1. Timezone Check
    await testTimezoneResolution('Asia/Kolkata') // Example timezone

    // 2. Image Stack Generation
    const stackResult = await runVideoGenerationTest(user.id, 'image_stack')
    
    // 3. AI Video Generation
    if (stackResult) {
      await runVideoGenerationTest(user.id, 'ai_video')
    }

    console.log('\n=============================================')
    console.log('✨ ALL E2E TESTS COMPLETED')
    console.log('=============================================')

  } catch (err) {
    console.error('\n❌ Fatal Test Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
