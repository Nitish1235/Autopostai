import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db/prisma'

// ── Subscription Expiry Cron ─────────────────────────
// Runs daily at midnight UTC. Finds users whose cancelled
// subscription period has ended and downgrades them to free.

export const subscriptionExpiry = inngest.createFunction(
    { id: 'subscription-expiry', name: 'Subscription Expiry Check' },
    { cron: '0 0 * * *' }, // Daily at midnight UTC
    async ({ step }) => {
        const expiredUsers = await step.run('find-expired-subscriptions', async () => {
            return prisma.user.findMany({
                where: {
                    subscriptionEndsAt: { lte: new Date() },
                    plan: { not: 'free' },
                },
                select: { id: true, plan: true },
            })
        })

        if (expiredUsers.length === 0) {
            return { downgraded: 0 }
        }

        let downgraded = 0

        for (const user of expiredUsers) {
            await step.run(`downgrade-${user.id}`, async () => {
                // Downgrade to free (no active subscription)
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        plan: 'free',
                        credits: 0,
                        creditsUsed: 0,
                        dodoSubscriptionId: null,
                        subscriptionEndsAt: null,
                    },
                })

                // Log the transition
                await prisma.creditTransaction.create({
                    data: {
                        userId: user.id,
                        type: 'reset',
                        credits: 0,
                        description: 'Subscription expired — plan reverted to free',
                        balanceAfter: 0,
                    },
                })
            })

            downgraded++
        }

        return { downgraded }
    }
)
