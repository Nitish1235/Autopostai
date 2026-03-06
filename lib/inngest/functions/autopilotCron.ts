import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { checkCredits, deductCredit, addCredits } from '@/lib/utils/credits'
import { addVideoToQueue } from '@/lib/queue/videoQueue'
import { getSegmentCount } from '@/lib/prompts/scriptPrompt'
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
        where: { enabled: true },
        include: {
          user: {
            select: {
              id: true,
              credits: true,
              plan: true,
            },
          },
        },
      })
    })

    // Step 2 — Process each user
    for (const config of autopilots) {
      processed++

      await step.run(`process-user-${config.userId}`, async () => {
        // a. Check credits
        const creditStatus = await checkCredits(config.userId)
        if (!creditStatus.hasCredits) {
          return
        }

        // b. Check schedule: does current time match any slot?
        const now = new Date()
        const currentDay = DAY_NAMES[now.getUTCDay()]
        const currentHour = now.getUTCHours()

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

        if (matchingSlots.length === 0) {
          return
        }

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

        if (todayPostCount >= config.postsPerDay) {
          return
        }

        // d. BUG FIX #1: Duplicate-run prevention
        //    Check if a video was already created in the current hour for this user
        const hourStart = new Date()
        hourStart.setUTCMinutes(0, 0, 0)
        const alreadyFiredThisHour = await prisma.video.count({
          where: {
            userId: config.userId,
            topicQueueId: { not: null },
            createdAt: { gte: hourStart },
          },
        })
        if (alreadyFiredThisHour > 0) {
          return // Already processed a slot in this hour — skip
        }

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
          // 24 hour review window
          scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        } else {
          // FIX #14: Autopilot mode — publish ASAP when video is ready.
          // Don't use the slot time (it may already be past within the hour).
          // videoReady.ts handles immediate publishing for autopilot mode.
          scheduledAt = now
        }

        // g. BUG FIX #3: Deduct credit FIRST (atomic guard: throws if credits = 0)
        //    We don't have a videoId yet, so pass a placeholder and update later
        await deductCredit(
          config.userId,
          'autopilot-pending',
          'Autopilot video generation'
        )

        // h. Create video (credit already deducted — refund if this fails)
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
              subtitleConfig: config.subtitleConfig ?? {},
              platforms: matchingSlots.map((s) => s.platform),
              scheduledAt,
              status: 'pending',
              creditsUsed: 1,
              title: topic.topic.slice(0, 60),
              imageUrls: [],
              topicQueueId: topic.id,
            },
          })
        } catch (err) {
          // Refund the credit since video creation failed
          await addCredits(config.userId, 1, 'refund', 'Autopilot video creation failed')
          throw err
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
        } catch (err) {
          // Clean up: delete video and refund credit
          await prisma.video.delete({ where: { id: video.id } })
          await addCredits(config.userId, 1, 'refund', 'Autopilot queue failed — credit returned')
          throw err
        }

        // j. BUG FIX #5: Mark topic "generating" ONLY after video + queue succeed
        await prisma.topicQueue.update({
          where: { id: topic.id },
          data: {
            status: 'generating',
            videoId: video.id,
            scheduledFor: scheduledAt,
          },
        })

        // k. Update autopilot last run + FIX #13: Set nextRunAt to actual next slot
        await prisma.autopilotConfig.update({
          where: { id: config.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: getNextScheduledSlot(schedule),
          },
        })

        videosScheduled++
      })
    }

    // Step 3 — Replenish topics for users with < 3 pending
    await step.run('replenish-topics', async () => {
      // Find users with low topic counts
      const lowTopicUsers = await prisma.autopilotConfig.findMany({
        where: { enabled: true },
        select: {
          userId: true,
          niche: true,
        },
      })

      for (const user of lowTopicUsers) {
        const pendingCount = await prisma.topicQueue.count({
          where: {
            userId: user.userId,
            status: 'pending',
          },
        })

        if (pendingCount < 3) {
          await inngest.send({
            name: 'topics/generate',
            data: {
              userId: user.userId,
              niche: user.niche,
              count: 10,
            },
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

function getNextScheduledSlot(schedule: WeeklySchedule): Date {
  const now = new Date()
  const currentDayIndex = now.getUTCDay()

  // Scan the next 7 days (starting from today)
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (currentDayIndex + offset) % 7
    const dayName = DAY_ORDER[dayIndex]
    const slots: ScheduleSlot[] = schedule[dayName] ?? []

    // Sort slots by time so we find the earliest match
    const enabledSlots = slots
      .filter((s) => s.enabled)
      .sort((a, b) => a.time.localeCompare(b.time))

    for (const slot of enabledSlots) {
      const [hours, minutes] = slot.time.split(':').map(Number)
      const candidate = new Date(now)
      candidate.setUTCDate(candidate.getUTCDate() + offset)
      candidate.setUTCHours(hours, minutes, 0, 0)

      if (candidate > now) {
        return candidate
      }
    }
  }

  // Fallback: tomorrow at 18:00 UTC
  const fallback = new Date(now)
  fallback.setUTCDate(fallback.getUTCDate() + 1)
  fallback.setUTCHours(18, 0, 0, 0)
  return fallback
}
