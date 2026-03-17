import { prisma } from '@/lib/db/prisma'
import { AI_VIDEO_LIMITS } from '@/lib/utils/constants'
import { isAdminUser } from '@/lib/utils/credits'

// ── Check AI Video Credits ────────────────────────────

export async function checkAiVideoCredits(
    userId: string
): Promise<{
    hasCredits: boolean
    credits: number
    creditsUsed: number
    plan: string
}> {
    // Admin users always have unlimited AI video credits
    if (await isAdminUser(userId)) {
        return { hasCredits: true, credits: 9999, creditsUsed: 0, plan: 'admin' }
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            aiVideoCredits: true,
            aiVideoCreditsUsed: true,
            plan: true,
        },
    })

    if (!user) {
        throw new Error(`User not found: ${userId}`)
    }

    return {
        hasCredits: user.aiVideoCredits > 0,
        credits: user.aiVideoCredits,
        creditsUsed: user.aiVideoCreditsUsed,
        plan: user.plan,
    }
}

// ── Deduct AI Video Credit ────────────────────────────

export async function deductAiVideoCredit(
    userId: string,
    videoId: string,
    description: string = 'AI Video generation'
): Promise<void> {
    // Admin users skip AI video credit deduction
    if (await isAdminUser(userId)) {
        console.log(`[aiCredits] Admin user ${userId} — skipping AI video credit deduction`)
        return
    }

    // Atomic guard: only decrements if aiVideoCredits > 0
    const result = await prisma.user.updateMany({
        where: {
            id: userId,
            aiVideoCredits: { gt: 0 },
        },
        data: {
            aiVideoCredits: { decrement: 1 },
            aiVideoCreditsUsed: { increment: 1 },
        },
    })

    if (result.count === 0) {
        throw new Error('Insufficient AI video credits')
    }

    // Fetch updated balance for transaction record
    const updated = await prisma.user.findUnique({
        where: { id: userId },
        select: { aiVideoCredits: true },
    })

    await prisma.creditTransaction.create({
        data: {
            userId,
            type: 'usage',
            credits: 0, // Doesn't affect regular credits
            description: `[AI Video] ${description}`,
            videoId,
            balanceAfter: updated!.aiVideoCredits,
        },
    })
}

// ── Reset Monthly AI Video Credits ────────────────────

export async function resetMonthlyAiVideoCredits(
    userId: string
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    })

    if (!user) {
        throw new Error(`User not found: ${userId}`)
    }

    const limit = getAiVideoLimit(user.plan)

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                aiVideoCredits: limit,
                aiVideoCreditsUsed: 0,
            },
        }),
        prisma.creditTransaction.create({
            data: {
                userId,
                type: 'reset',
                credits: 0,
                description: `[AI Video] Monthly reset: ${limit} clips`,
                balanceAfter: limit,
            },
        }),
    ])
}

// ── Add AI Video Credits (Refunds/Bonus) ──────────────

export async function addAiVideoCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund' | 'reset',
    description: string
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { aiVideoCredits: true },
    })

    if (!user) {
        throw new Error(`User not found: ${userId}`)
    }

    const newBalance = user.aiVideoCredits + amount

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                aiVideoCredits: { increment: amount },
            },
        }),
        prisma.creditTransaction.create({
            data: {
                userId,
                type,
                credits: 0, // Doesn't affect regular credits
                description: `[AI Video] ${description}`,
                balanceAfter: newBalance,
            },
        }),
    ])
}

// ── Get AI Video Limit ────────────────────────────────

export function getAiVideoLimit(plan: string): number {
    return AI_VIDEO_LIMITS[plan] ?? 0
}
