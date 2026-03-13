import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  verifyWebhookSignature,
  getPlanFromPriceId,
} from '@/lib/dodo/index'
import { addCredits, upgradeCredits, resetMonthlyCredits } from '@/lib/utils/credits'
import { resetMonthlyAiVideoCredits } from '@/lib/utils/aiVideoCredits'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy_token',
})

// ── Webhook Event Types (from Dodo SDK/docs) ─────────
// Dodo webhook structure:
// {
//   business_id: string,
//   type: string,           // e.g. "subscription.active", "payment.succeeded"
//   timestamp: string,      // ISO 8601
//   data: { ... }           // event-specific payload (Subscription or Payment object)
// }

interface DodoWebhookPayload {
  business_id: string
  type: string
  timestamp: string
  data: unknown
}

// Subscription data object (from SDK: Subscription interface)
interface SubscriptionData {
  subscription_id: string
  product_id: string
  status: string
  customer: {
    customer_id: string
    email: string
    name: string
  }
  next_billing_date: string
  previous_billing_date: string
  metadata?: Record<string, string>
}

// Payment data object (from SDK: Payment interface)
interface PaymentData {
  payment_id: string
  customer: {
    customer_id: string
    email: string
    name: string
  }
  metadata?: Record<string, string>
  status?: string
  total_amount?: number
  product_cart?: Array<{ product_id: string; quantity: number }>
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

    // 3. Verify signature
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

    // 4. Parse event — Dodo sends { business_id, type, timestamp, data }
    const event: DodoWebhookPayload = JSON.parse(rawBody)

    console.log(`[webhook/dodo] Received event: ${event.type}`, JSON.stringify(event.data))

    // 5. Idempotency check — prevent duplicate processing
    const subData = event.data as Partial<SubscriptionData>
    const payData = event.data as Partial<PaymentData>
    const eventId = subData.subscription_id ?? payData.payment_id ?? event.timestamp
    if (eventId) {
      const idempotencyKey = `webhook_processed:${event.type}:${eventId}`
      try {
        const alreadyProcessed = await redis.get(idempotencyKey)
        if (alreadyProcessed) {
          return NextResponse.json(
            { success: true, received: true, duplicate: true },
            { status: 200 }
          )
        }
      } catch {
        // Redis unavailable — continue processing (at-least-once)
      }
    }

    // 6. Handle event types
    // Dodo event types: subscription.active, subscription.cancelled,
    // subscription.renewed, subscription.on_hold, subscription.failed, subscription.expired,
    // payment.succeeded, payment.failed, etc.
    switch (event.type) {
      // ── Subscription activated ──────────────────────
      // Event type from docs: "subscription.active"
      case 'subscription.active': {
        const sub = event.data as SubscriptionData
        const customerId = sub.customer?.customer_id
        const productId = sub.product_id

        if (!customerId || !productId) {
          console.warn('[webhook/dodo] subscription.active missing customer_id or product_id')
          break
        }

        const user = await prisma.user.findUnique({
          where: { dodoCustomerId: customerId },
        })
        if (!user) {
          console.warn(`[webhook/dodo] No user found for customer_id: ${customerId}`)
          break
        }

        const plan = getPlanFromPriceId(productId)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            dodoSubscriptionId: sub.subscription_id ?? null,
          },
        })

        // Carry over remaining credits from old plan into new plan
        await upgradeCredits(user.id, plan)
        await resetMonthlyAiVideoCredits(user.id)

        console.log(`[webhook/dodo] Subscription activated: user=${user.id}, plan=${plan}, sub=${sub.subscription_id}`)
        break
      }

      // ── Subscription cancelled ─────────────────────
      case 'subscription.cancelled': {
        const sub = event.data as SubscriptionData
        if (!sub.subscription_id) break

        const user = await prisma.user.findUnique({
          where: { dodoSubscriptionId: sub.subscription_id },
        })
        if (!user) break

        // Use next_billing_date as the end of the current period
        let subscriptionEndsAt: Date
        if (sub.next_billing_date) {
          subscriptionEndsAt = new Date(sub.next_billing_date)
        } else {
          // Fallback: 30 days from now
          subscriptionEndsAt = new Date()
          subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30)
        }

        // Keep user on current plan — set end date for cron to downgrade later
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionEndsAt },
        })

        console.log(`[webhook/dodo] Subscription cancelled: user=${user.id}, endsAt=${subscriptionEndsAt.toISOString()}`)
        break
      }

      // ── Subscription renewed ───────────────────────
      case 'subscription.renewed': {
        const sub = event.data as SubscriptionData
        if (!sub.subscription_id) break

        const user = await prisma.user.findUnique({
          where: { dodoSubscriptionId: sub.subscription_id },
        })
        if (!user) break

        await resetMonthlyCredits(user.id)
        await resetMonthlyAiVideoCredits(user.id)

        console.log(`[webhook/dodo] Subscription renewed: user=${user.id}`)
        break
      }

      // ── Payment succeeded ──────────────────────────
      case 'payment.succeeded': {
        const payment = event.data as PaymentData
        const customerId = payment.customer?.customer_id

        if (payment.metadata?.type === 'credit_pack' && customerId) {
          const user = await prisma.user.findUnique({
            where: { dodoCustomerId: customerId },
          })

          const credits = parseInt(payment.metadata?.credits ?? '0', 10)
          if (!user || isNaN(credits) || credits <= 0) break

          await addCredits(
            user.id,
            credits,
            'purchase',
            `Credit pack: ${credits} videos`,
            payment.payment_id
          )

          console.log(`[webhook/dodo] Credits added: user=${user.id}, credits=${credits}`)
        }
        break
      }

      default:
        console.log(`[webhook/dodo] Ignoring event type: ${event.type}`)
        break
    }

    // 7. Mark as processed — 7 day TTL (longer than any retry window)
    if (eventId) {
      try {
        await redis.set(`webhook_processed:${event.type}:${eventId}`, '1', { ex: 604800 })
      } catch {
        // Redis unavailable — non-critical
      }
    }

    // 8. Acknowledge
    return NextResponse.json(
      { success: true, received: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[webhook/dodo] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
