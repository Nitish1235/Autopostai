import { prisma } from '@/lib/db/prisma'
import { PLANS } from '@/lib/utils/constants'

// ── Admin users get unlimited credits ─────────────────
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'nitishjain135@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  return !!user && ADMIN_EMAILS.includes(user.email.toLowerCase())
}

// ── Check Credits ─────────────────────────────────────

export async function checkCredits(
  userId: string
): Promise<{
  hasCredits: boolean
  credits: number
  creditsUsed: number
  plan: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      creditsUsed: true,
      plan: true,
      email: true,
    },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  // Admin users always have credits
  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase())

  return {
    hasCredits: isAdmin || user.credits > 0,
    credits: isAdmin ? 9999 : user.credits,
    creditsUsed: user.creditsUsed,
    plan: user.plan,
  }
}

// ── Deduct Credit ─────────────────────────────────────

export async function deductCredit(
  userId: string,
  videoId: string,
  description: string = 'Video generation'
): Promise<void> {
  // Admin users skip credit deduction
  if (await isAdminUser(userId)) {
    console.log(`[credits] Admin user ${userId} — skipping credit deduction`)
    return
  }

  // Atomic guard: only decrements if credits > 0 — no double-spend
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      credits: { gt: 0 },
    },
    data: {
      credits: { decrement: 1 },
      creditsUsed: { increment: 1 },
    },
  })

  if (result.count === 0) {
    throw new Error('Insufficient credits')
  }

  // Fetch updated balance for the transaction record
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  await prisma.creditTransaction.create({
    data: {
      userId,
      type: 'usage',
      credits: -1,
      description,
      videoId,
      balanceAfter: updated!.credits,
    },
  })
}

// ── Add Credits ───────────────────────────────────────

export async function addCredits(
  userId: string,
  amount: number,
  type: 'purchase' | 'bonus' | 'refund' | 'reset',
  description: string,
  dodoPaymentId?: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const newBalance = user.credits + amount

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type,
        credits: amount,
        description,
        dodoPaymentId: dodoPaymentId ?? null,
        balanceAfter: newBalance,
      },
    }),
  ])
}

// ── Reset Monthly Credits ─────────────────────────────

export async function resetMonthlyCredits(
  userId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const planLimit = getPlanCreditLimit(user.plan)
  const resetDate = new Date()
  resetDate.setDate(resetDate.getDate() + 30)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: planLimit,
        creditsUsed: 0,
        creditsReset: resetDate,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type: 'reset',
        credits: planLimit,
        description: 'Monthly credit reset',
        balanceAfter: planLimit,
      },
    }),
  ])
}

// ── Upgrade Credits (carry-over remaining) ────────────

export async function upgradeCredits(
  userId: string,
  newPlan: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, plan: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const newPlanLimit = getPlanCreditLimit(newPlan)
  const remainingCredits = Math.max(0, user.credits)
  const totalCredits = newPlanLimit + remainingCredits
  const resetDate = new Date()
  resetDate.setDate(resetDate.getDate() + 30)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: totalCredits,
        creditsUsed: 0,
        creditsReset: resetDate,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type: 'reset',
        credits: totalCredits,
        description: `Plan upgrade: ${newPlanLimit} new + ${remainingCredits} carried over`,
        balanceAfter: totalCredits,
      },
    }),
  ])
}

// ── Get Credit History ────────────────────────────────

export async function getCreditHistory(
  userId: string,
  limit: number = 50
) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Get Plan Credit Limit ─────────────────────────────

export function getPlanCreditLimit(plan: string): number {
  switch (plan) {
    case 'starter':
      return PLANS.starter.credits // 30
    case 'pro':
      return PLANS.pro.credits // 100
    case 'creator_max':
      return PLANS.creator_max.credits // 300
    case 'free':
    default:
      return 0
  }
}
