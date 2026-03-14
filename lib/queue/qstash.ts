// ── Upstash QStash Client ─────────────────────────────
// Replaces BullMQ entirely. Publishes jobs via HTTPS
// to the worker Cloud Run service. Zero Redis connections.

import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
  baseUrl: process.env.QSTASH_URL, // Set this in GCP to https://qstash.upstash.io or your specific region URL to avoid Anycast EU routing issues
})

// The public URL of the Next.js app (job handlers are /api/jobs/* routes in the same app)
const WORKER_URL = process.env.WORKER_SERVICE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Enqueue a job by publishing it to a worker endpoint via QStash.
 * QStash will deliver the payload as an HTTP POST with retries.
 */
export async function enqueueJob(
  endpoint: string,
  data: Record<string, unknown>,
  options?: { retries?: number; deduplicationId?: string }
) {
  const targetUrl = `${WORKER_URL}${endpoint}`

  // Debug: log the full URL so we can see in Cloud Run logs what QStash targets
  console.log(`[qstash] Publishing job to: ${targetUrl}`)
  console.log(`[qstash] WORKER_URL=${WORKER_URL} (from WORKER_SERVICE_URL=${process.env.WORKER_SERVICE_URL ?? 'NOT SET'}, NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL ?? 'NOT SET'})`)

  if (WORKER_URL.includes('localhost')) {
    console.error(`[qstash] ⚠️ WARNING: WORKER_URL is localhost — QStash cannot deliver to localhost! Set WORKER_SERVICE_URL in Cloud Run env vars.`)
  }

  const response = await qstash.publishJSON({
    url: targetUrl,
    body: data,
    retries: options?.retries ?? 3,
    deduplicationId: options?.deduplicationId,
  })

  console.log(`[qstash] Enqueued job to ${endpoint}: messageId=${response.messageId}`)
  return response
}
