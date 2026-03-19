import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { checkCredits, deductCredit, addCredits, isAdminEmail } from '@/lib/utils/credits'
import { checkAiVideoCredits, deductAiVideoCredit, addAiVideoCredits } from '@/lib/utils/aiVideoCredits'
import { addVideoToQueue } from '@/lib/queue/videoQueue'
import { getSegmentCount } from '@/lib/prompts/scriptPrompt'
import { getDailyPostLimit, canAutoPost } from '@/lib/utils/plans'
import type { ScheduleSlot, WeeklySchedule } from '@/types'

// ── Day Name Map ─────────────────────────────────────
const DAY_NAMES: Record<number, keyof WeeklySchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

// ── Autopilot Hourly Cron ────────────────────────────

export const autopilotCron = inngest.createFunction(
  { id: 'autopilot-cron', name: 'Autopilot Hourly Check' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    let processed = 0
    let videosScheduled = 0

    // Step 1 — Find all active autopilots
    const autopilots = await step.run('find-active-autopilots', async () => {
      return prisma.autopilotConfig.findMany({
        where: { 
            enabled: true,
            // Optimization: Skip configs that have failed too many times
            // Using any to bypass local prisma client sync issues
            ...( { consecutiveFailures: { lt: 3 } } as any )
        },
        include: {
          user: {
            select: {
              id: true,
              credits: true,
              plan: true,
              email: true,
            },
          },
        },
      })
    })

    // Step 2 — Process each user
    for (const rawConfig of autopilots) {
      processed++
      const config = rawConfig as any // Type assertion for Inngest serialization + new fields

      await step.run(`process-user-${config.userId}`, async () => {
        const generationMode = config.generationMode || 'image_stack'
        const isAiVideo = generationMode === 'ai_video'
        const isAdmin = isAdminEmail(config.user?.email)

        // a. Check credits based on mode (Bypass for admin)
        if (isAiVideo) {
            const aiStatus = await checkAiVideoCredits(config.userId)
            if (!aiStatus.hasCredits && !isAdmin) return
        } else {
            const creditStatus = await checkCredits(config.userId)
            if (!creditStatus.hasCredits && !isAdmin) return
        }

        // b-1. Enforce plan-level posting cap
        const planMax = isAdmin ? 100 : getDailyPostLimit(config.user?.plan)
        if (!canAutoPost(config.user?.plan) && !isAdmin) return
        const effectiveDailyMax = Math.min(config.postsPerDay, planMax)

        // b-2. Check schedule: does current time match any slot?
        const now = new Date()
        const timeZone = config.timezone || 'UTC'

        // Format to get user's local hour (0-23) and weekday
        const formatterHour = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: 'numeric',
          hourCycle: 'h23',
        })
        const formatterDay = new Intl.DateTimeFormat('en-US', {
          timeZone,
          weekday: 'long',
        })

        const currentHour = parseInt(formatterHour.format(now), 10)
        const currentDay = formatterDay.format(now).toLowerCase() as keyof WeeklySchedule


        let schedule: WeeklySchedule
        try {
          schedule =
            typeof config.schedule === 'string'
              ? JSON.parse(config.schedule)
              : (config.schedule as unknown as WeeklySchedule)
        } catch {
          return
        }

        const todaySlots: ScheduleSlot[] = schedule[currentDay] ?? []
        const matchingSlots = todaySlots.filter((slot) => {
          if (!slot.enabled) return false
          const slotHour = parseInt(slot.time.split(':')[0], 10)
          return slotHour === currentHour
        })

        if (matchingSlots.length === 0) return

        // c. Check daily posting limit
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)

        const todayPostCount = await prisma.video.count({
          where: {
            userId: config.userId,
            createdAt: { gte: todayStart },
            status: { not: 'failed' },
          },
        })

        if (todayPostCount >= effectiveDailyMax && !isAdmin) return

        // d. Duplicate-run prevention
        const hourStart = new Date()
        hourStart.setUTCMinutes(0, 0, 0)
        const alreadyFiredThisHour = await prisma.video.count({
          where: {
            userId: config.userId,
            topicQueueId: { not: null },
            createdAt: { gte: hourStart },
          },
        })
        if (alreadyFiredThisHour > 0 && !isAdmin) return

        // e. Get next pending topic from queue
        const topic = await prisma.topicQueue.findFirst({
          where: {
            userId: config.userId,
            status: 'pending',
          },
          orderBy: { order: 'asc' },
        })

        // If no topics, request topic generation
        if (!topic) {
          await inngest.send({
            name: 'topics/generate',
            data: {
              userId: config.userId,
              niche: config.niche,
              count: 10,
            },
          })
          return
        }

        // f. Determine scheduling
        let scheduledAt: Date | null = null
        if (config.approvalMode === 'review') {
          scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        } else {
          scheduledAt = now
        }

        // g. Create video FIRST
        let video
        try {
          video = await prisma.video.create({
            data: {
              userId: config.userId,
              topic: topic.topic,
              niche: config.niche,
              format: config.format,
              imageStyle: config.imageStyle,
              voiceId: config.voiceId,
              voiceSpeed: 1.0,
              musicMood: config.musicMood,
              musicVolume: 0.15,
              subtitleConfig: (config.subtitleConfig as any) ?? {},
              platforms: matchingSlots.map((s) => s.platform),
              scheduledAt,
              status: 'pending',
              creditsUsed: 1,
              generationMode: generationMode as any,
              title: topic.topic.slice(0, 60),
              imageUrls: [],
              topicQueueId: topic.id,
            },
          })
        } catch (err) {
            console.error('[autopilot] Failed to create video record:', err)
            // Tracking failure
            await prisma.autopilotConfig.update({
                where: { userId: config.userId },
                data: { consecutiveFailures: { increment: 1 } } as any
            })
            return
        }

        // h. Deduct credit (skip if admin)
        try {
            if (isAiVideo) {
                await deductAiVideoCredit(config.userId, video.id, 'Autopilot (AI Video)')
            } else {
                await deductCredit(config.userId, video.id, 'Autopilot')
            }
        } catch (err) {
            // Clean up: delete video
            await prisma.video.delete({ where: { id: video.id } })
            return
        }

        // i. Queue for processing
        try {
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
          
          // SUCCESS! Reset failure counter
          await prisma.autopilotConfig.update({
            where: { userId: config.userId },
            data: { 
                consecutiveFailures: 0,
                lastRunAt: new Date(),
                nextRunAt: getNextScheduledSlot(schedule, timeZone)
            } as any
          })

          // Mark topic "generating"
          await prisma.topicQueue.update({
            where: { id: topic.id },
            data: {
              status: 'generating',
              videoId: video.id,
              scheduledFor: scheduledAt,
            },
          })

          videosScheduled++

        } catch (err) {
          console.error('[autopilot] Queue failed:', err)
          // Clean up: delete video and refund credit
          await prisma.video.delete({ where: { id: video.id } })
          if (isAiVideo) {
              await addAiVideoCredits(config.userId, 1, 'refund', 'Autopilot queue failed')
          } else {
              await addCredits(config.userId, 1, 'refund', 'Autopilot queue failed')
          }
          // Increment failures
          await prisma.autopilotConfig.update({
            where: { userId: config.userId },
            data: { consecutiveFailures: { increment: 1 } } as any
          })
          throw err
        }
      })
    }

    // Step 3 — Replenish topics for users with < 3 pending
    await step.run('replenish-topics', async () => {
      const lowTopicUsers = await prisma.autopilotConfig.findMany({
        where: { 
            enabled: true,
            ...( { consecutiveFailures: { lt: 3 } } as any )
        },
        select: { userId: true, niche: true },
      })

      for (const user of lowTopicUsers) {
        const pendingCount = await prisma.topicQueue.count({
          where: { userId: user.userId, status: 'pending' },
        })

        if (pendingCount < 3) {
          await inngest.send({
            name: 'topics/generate',
            data: { userId: user.userId, niche: user.niche, count: 10 },
          })
        }
      }
    })

    return { processed, videosScheduled }
  }
)

// ── Helper: Get next scheduled slot from a weekly schedule ──

const DAY_ORDER: (keyof WeeklySchedule)[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
]

function getNextScheduledSlot(schedule: WeeklySchedule, timeZone: string = 'UTC'): Date {
  const now = new Date()

  const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })
  const formatterMin = new Intl.DateTimeFormat('en-US', { timeZone, minute: 'numeric' })
  const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' })

  const currentHour = parseInt(formatterHour.format(now), 10)
  const currentMin = parseInt(formatterMin.format(now), 10)
  const currentDayName = formatterDay.format(now).toLowerCase() as keyof WeeklySchedule
  const currentDayIndex = DAY_ORDER.indexOf(currentDayName)

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (currentDayIndex + offset) % 7
    const dayName = DAY_ORDER[dayIndex]
    const slots: ScheduleSlot[] = schedule[dayName] ?? []

    const enabledSlots = slots
      .filter((s) => s.enabled)
      .sort((a, b) => a.time.localeCompare(b.time))

    for (const slot of enabledSlots) {
      const [slotH, slotM] = slot.time.split(':').map(Number)
      
      if (offset === 0) {
        if (slotH > currentHour || (slotH === currentHour && slotM > currentMin)) {
          const diffMins = (slotH - currentHour) * 60 + (slotM - currentMin)
          return new Date(now.getTime() + diffMins * 60000)
        }
      } else {
        const diffMins = (offset * 24 * 60) + (slotH * 60 + slotM) - (currentHour * 60 + currentMin)
        return new Date(now.getTime() + diffMins * 60000)
      }
    }
  }

  // Fallback to exactly 24 hours from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}
