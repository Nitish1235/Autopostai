import { createHmac, timingSafeEqual } from 'crypto'
import type { Plan } from '@/types'

// ── Config ────────────────────────────────────────────
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'https://test.dodopayments.com' 
  : 'https://live.dodopayments.com'
const API_KEY = process.env.DODO_PAYMENTS_API_KEY ?? ''

// ── HTTP Helper ───────────────────────────────────────
async function dodoFetch<T>(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Dodo API error [${response.status}] ${method} ${endpoint}: ${errorBody}`
    )
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

// ── Create Customer ───────────────────────────────────
export async function createCustomer(
  email: string,
  name: string
): Promise<{ customerId: string }> {
  const result = await dodoFetch<{ id: string }>('/customers', 'POST', {
    email,
    name,
  })
  return { customerId: result.id }
}

// ── Create Subscription ──────────────────────────────
export async function createSubscription(
  customerId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ subscriptionId: string; checkoutUrl: string }> {
  const result = await dodoFetch<{
    id: string
    checkout_url: string
  }>('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: planId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
  return {
    subscriptionId: result.id,
    checkoutUrl: result.checkout_url,
  }
}

// ── Cancel Subscription ──────────────────────────────
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  await dodoFetch(`/subscriptions/${subscriptionId}`, 'DELETE')
}

// ── Get Subscription ─────────────────────────────────
export async function getSubscription(
  subscriptionId: string
): Promise<{
  status: string
  planId: string
  currentPeriodEnd: string
}> {
  const result = await dodoFetch<{
    status: string
    plan_id: string
    current_period_end: string
  }>(`/subscriptions/${subscriptionId}`, 'GET')
  return {
    status: result.status,
    planId: result.plan_id,
    currentPeriodEnd: result.current_period_end,
  }
}

// ── Create One-Time Payment ──────────────────────────
export async function createOneTimePayment(
  customerId: string,
  amount: number,
  currency: string,
  description: string,
  successUrl: string,
  metadata?: Record<string, string>
): Promise<{ paymentId: string; checkoutUrl: string }> {
  const result = await dodoFetch<{
    id: string
    checkout_url: string
  }>('/payments', 'POST', {
    customer_id: customerId,
    amount,
    currency,
    description,
    success_url: successUrl,
    ...(metadata && { metadata }),
  })
  return {
    paymentId: result.id,
    checkoutUrl: result.checkout_url,
  }
}

// ── Verify Webhook Signature ─────────────────────────
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const computed = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Must be same length before timingSafeEqual
  if (computed.length !== signature.length) return false

  return timingSafeEqual(
    Buffer.from(computed, 'utf8'),
    Buffer.from(signature, 'utf8')
  )
}

// ── Map Plan ID to Plan ──────────────────────────────
export function getPlanFromPriceId(priceId: string): Plan {
  const mapping: Record<string, Plan> = {
    [process.env.DODO_STARTER_PLAN_ID ?? '']: 'starter',
    [process.env.DODO_PRO_PLAN_ID ?? '']: 'pro',
    [process.env.DODO_MAX_PLAN_ID ?? '']: 'creator_max',
  }

  const plan = mapping[priceId]
  if (!plan) {
    throw new Error(`Unknown plan ID: ${priceId}`)
  }
  return plan
}
