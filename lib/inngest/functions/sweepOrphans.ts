import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'
import { addCredits } from '@/lib/utils/credits'
import { addAiVideoCredits } from '@/lib/utils/aiVideoCredits'

// ── Orphaned Video Sweeper ───────────────────────────
// Runs every hour to find videos stuck in 'pending' for over 1 hour.
// This happens if the server crashes between credit deduction and queue dispatch.

export const sweepOrphans = inngest.createFunction(
  { id: 'sweep-orphans', name: 'Sweep Orphaned Videos' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    // Step 1: Find orphaned videos
    const orphaned = await step.run('find-orphans', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      return prisma.video.findMany({
        where: {
          status: 'pending',
          createdAt: { lt: oneHourAgo }, // Stuck for over an hour
        },
        select: {
          id: true,
          userId: true,
          generationMode: true,
        },
      })
    })

    if (orphaned.length === 0) {
      return { refunded: 0 }
    }

    // Step 2: Refund credits and delete records
    const result = await step.run('refund-and-delete', async () => {
      let refundedCount = 0

      for (const video of orphaned) {
        try {
          const isAiVideo = video.generationMode === 'ai_video'

          if (isAiVideo) {
            await addAiVideoCredits(
              video.userId,
              1,
              'refund',
              'System recovered lost AI Video credit'
            )
          } else {
            await addCredits(
              video.userId,
              1,
              'refund',
              'System recovered lost Autopilot credit'
            )
          }

          // Delete the zombie record
          await prisma.video.delete({ where: { id: video.id } })

          refundedCount++
        } catch (error) {
          console.error(`[sweepOrphans] Failed to recover video ${video.id}:`, error)
        }
      }

      return refundedCount
    })

    return { refunded: result }
  }
)
