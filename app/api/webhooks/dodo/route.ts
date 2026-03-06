import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  verifyWebhookSignature,
  getPlanFromPriceId,
  getSubscription,
} from '@/lib/dodo/index'
import { addCredits, upgradeCredits, resetMonthlyCredits } from '@/lib/utils/credits'
import { resetMonthlyAiVideoCredits } from '@/lib/utils/aiVideoCredits'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface DodoWebhookEvent {
  id?: string
  type: string
  subscriptionId?: string
  customerId?: string
  planId?: string
  paymentId?: string
  metadata?: {
    type?: string
    credits?: string
    userId?: string
    packId?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body
    const rawBody = await req.text()

    // 2. Get signature
    const signature = req.headers.get('dodo-signature')
    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 3. Verify signature — FIX #8: reject if secret is not configured
    const secret = process.env.DODO_WEBHOOK_SECRET
    if (!secret) {
      console.error('[webhook/dodo] DODO_WEBHOOK_SECRET env var is not set')
      return NextResponse.json(
        { success: false, error: 'Webhook not configured' },
        { status: 500 }
      )
    }
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // 4. Parse event
    const event: DodoWebhookEvent = JSON.parse(rawBody)

    // 5. Idempotency check — prevent duplicate processing
    const eventId = event.id ?? event.paymentId ?? event.subscriptionId
    if (eventId) {
      const idempotencyKey = `webhook_processed:${eventId}`
      const alreadyProcessed = await redis.get(idempotencyKey)
      if (alreadyProcessed) {
        return NextResponse.json(
          { success: true, received: true, duplicate: true },
          { status: 200 }
        )
      }
    }

    // 6. Handle event types
    switch (event.type) {
      case 'subscription.activated': {
        if (!event.customerId || !event.planId) break

        const user = await prisma.user.findUnique({
          where: { dodoCustomerId: event.customerId },
        })
        if (!user) break

        const plan = getPlanFromPriceId(event.planId)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            dodoSubscriptionId: event.subscriptionId ?? null,
          },
        })

        // Carry over remaining credits from old plan into new plan
        await upgradeCredits(user.id, plan)
        await resetMonthlyAiVideoCredits(user.id)
        break
      }

      case 'subscription.cancelled': {
        if (!event.subscriptionId) break

        const user = await prisma.user.findUnique({
          where: { dodoSubscriptionId: event.subscriptionId },
        })
        if (!user) break

        // Fetch subscription end date from Dodo
        let subscriptionEndsAt: Date
        try {
          const sub = await getSubscription(event.subscriptionId)
          subscriptionEndsAt = new Date(sub.currentPeriodEnd)
        } catch {
          // Fallback: 30 days from now if Dodo fetch fails
          subscriptionEndsAt = new Date()
          subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30)
        }

        // Keep user on current plan — set end date for cron to downgrade later
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionEndsAt },
        })
        break
      }

      case 'subscription.renewed': {
        if (!event.subscriptionId) break

        const user = await prisma.user.findUnique({
          where: { dodoSubscriptionId: event.subscriptionId },
        })
        if (!user) break

        await resetMonthlyCredits(user.id)
        await resetMonthlyAiVideoCredits(user.id)
        break
      }

      case 'payment.succeeded': {
        if (event.metadata?.type === 'credit_pack' && event.customerId) {
          const user = await prisma.user.findUnique({
            where: { dodoCustomerId: event.customerId },
          })

          const credits = parseInt(event.metadata?.credits ?? '0', 10)
          if (!user || isNaN(credits) || credits <= 0) break

          await addCredits(
            user.id,
            credits,
            'purchase',
            `Credit pack: ${credits} videos`,
            event.paymentId
          )
        }
        break
      }

      default:
        // Ignore unknown event types
        break
    }

    // 7. Mark as processed — 7 day TTL (longer than any retry window)
    if (eventId) {
      await redis.set(`webhook_processed:${eventId}`, '1', { ex: 604800 })
    }

    // 8. Acknowledge
    return NextResponse.json(
      { success: true, received: true },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
