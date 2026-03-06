import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'

// ── On Video Created ─────────────────────────────────
// Triggered when a new video is created (video/created event)

export const onVideoCreated = inngest.createFunction(
  { id: 'on-video-created', name: 'On Video Created' },
  { event: 'video/created' },
  async ({ event, step }) => {
    const { videoId, userId } = event.data

    // Step 1 — Check low credits
    await step.run('check-low-credits', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          email: true,
          name: true,
          notifyCreditLow: true,
        },
      })

      if (!user) return

      if (user.credits <= 3 && user.notifyCreditLow && user.email) {
        // Dynamic import to avoid loading Resend at top-level
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com'

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
          to: user.email,
          subject: `Low credits — ${user.credits} videos remaining`,
          html: `
            <div style="font-family: Inter, system-ui, sans-serif; background: #1C1C1E; color: #F5F5F7; padding: 48px 32px; max-width: 560px; margin: 0 auto;">
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">
                ⚠️ You have ${user.credits} video${user.credits === 1 ? '' : 's'} remaining
              </h2>
              <p style="color: rgba(245,245,247,0.6); font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Hey ${user.name ?? 'there'}, your credit balance is running low. 
                Top up to keep your channel running without interruptions.
              </p>
              <a href="${appUrl}/settings?tab=credits" 
                 style="display: inline-block; background: #0A84FF; color: #fff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Top Up Credits →
              </a>
            </div>
          `,
        })
      }
    })

    // Step 2 — Update topic queue
    await step.run('update-topic-queue', async () => {
      // Find TopicQueue entry linked to this videoId
      const topicEntry = await prisma.topicQueue.findFirst({
        where: { videoId },
      })

      if (topicEntry) {
        await prisma.topicQueue.update({
          where: { id: topicEntry.id },
          data: { status: 'generating' },
        })
      }
    })

    return { processed: true }
  }
)
