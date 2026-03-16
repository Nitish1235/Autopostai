import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/db/prisma'
import {
  createCustomer,
  createSubscription,
  createOneTimePayment,
} from '@/lib/dodo'
import { CREDIT_PACKS, PLAN_TIER } from '@/lib/utils/constants'

// ── Schema ───────────────────────────────────────────

const CheckoutSchema = z.object({
  type: z.enum(['subscription', 'credit_pack']),
  planId: z.string().optional(),
  packId: z.string().optional(),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const VALID_PLAN_IDS: Record<string, string> = {
  starter: process.env.DODO_STARTER_PLAN_ID ?? '',
  pro: process.env.DODO_PRO_PLAN_ID ?? '',
  creator_max: process.env.DODO_MAX_PLAN_ID ?? '',
}

// Dodo product IDs for credit packs — reusing existing Cloud Run env vars
const CREDIT_PACK_PRODUCT_IDS: Record<string, string> = {
  pack_10: process.env.DODO_STARTER_PLAN_ID ?? '',
  pack_25: process.env.DODO_PRO_PLAN_ID ?? '',
  pack_50: process.env.DODO_MAX_PLAN_ID ?? '',
}

// ── POST — Create Checkout Session ───────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = CheckoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, planId, packId } = parsed.data

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, dodoCustomerId: true, plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Ensure user has Dodo customer
    let customerId = user.dodoCustomerId
    if (!customerId) {
      const result = await createCustomer(user.email, user.name ?? user.email)
      customerId = result.customerId
      await prisma.user.update({
        where: { id: user.id },
        data: { dodoCustomerId: customerId },
      })
    }

    if (type === 'subscription') {
      if (!planId || !VALID_PLAN_IDS[planId]) {
        return NextResponse.json(
          { success: false, error: 'Invalid plan ID' },
          { status: 400 }
        )
      }

      // Block downgrades — only upgrades allowed
      const currentTier = PLAN_TIER[user.plan] ?? 0
      const requestedTier = PLAN_TIER[planId] ?? 0

      if (requestedTier <= currentTier) {
        return NextResponse.json(
          {
            success: false,
            error: requestedTier === currentTier
              ? 'You are already on this plan'
              : 'Cannot downgrade your subscription. Please contact support if you need assistance.',
          },
          { status: 400 }
        )
      }

      const dodoPlanId = VALID_PLAN_IDS[planId]
      const successUrl = `${APP_URL}/settings?tab=subscription&success=1`
      const cancelUrl = `${APP_URL}/settings?tab=subscription`

      const result = await createSubscription(
        customerId,
        dodoPlanId,
        successUrl,
        cancelUrl
      )

      return NextResponse.json({
        success: true,
        data: { checkoutUrl: result.checkoutUrl },
      })
    }

    if (type === 'credit_pack') {
      if (!packId) {
        return NextResponse.json(
          { success: false, error: 'Missing packId' },
          { status: 400 }
        )
      }

      const pack = CREDIT_PACKS.find((p) => p.id === packId)
      if (!pack) {
        return NextResponse.json(
          { success: false, error: 'Invalid credit pack' },
          { status: 400 }
        )
      }

      const dodoProductId = CREDIT_PACK_PRODUCT_IDS[packId]
      if (!dodoProductId) {
        console.error(`[payments/checkout] Missing Dodo product ID for pack: ${packId}`)
        return NextResponse.json(
          { success: false, error: 'Credit pack not configured. Please contact support.' },
          { status: 500 }
        )
      }

      const successUrl = `${APP_URL}/settings?tab=credits&success=1`

      const result = await createOneTimePayment(
        customerId,
        dodoProductId,
        successUrl,
        {
          type: 'credit_pack',
          credits: pack.credits.toString(),
          userId: userId,
          packId: pack.id,
        }
      )

      return NextResponse.json({
        success: true,
        data: { checkoutUrl: result.checkoutUrl },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid checkout type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[payments/checkout] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
