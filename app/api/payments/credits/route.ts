import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { getPlanCreditLimit, getCreditHistory } from '@/lib/utils/credits'

// ── GET — Credit Info + History ──────────────────────

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        creditsUsed: true,
        plan: true,
        creditsReset: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const planLimit = getPlanCreditLimit(user.plan)
    const creditsUsed = user.creditsUsed
    const percentUsed = planLimit > 0
      ? Math.round((creditsUsed / planLimit) * 100)
      : 0

    // Calculate days until reset
    let daysUntilReset: number | null = null
    if (user.creditsReset) {
      const now = new Date()
      const resetDate = new Date(user.creditsReset)
      const diffMs = resetDate.getTime() - now.getTime()
      daysUntilReset = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    // Fetch last 50 transactions
    const transactions = await getCreditHistory(userId, 50)

    return NextResponse.json({
      success: true,
      data: {
        credits: user.credits,
        creditsUsed,
        planLimit,
        percentUsed,
        daysUntilReset,
        creditsReset: user.creditsReset,
        transactions,
      },
    })
  } catch (error) {
    console.error('[payments/credits] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
