// ── Upstash QStash Client ─────────────────────────────
// Replaces BullMQ entirely. Publishes jobs via HTTPS
// to the worker Cloud Run service. Zero Redis connections.

import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
  baseUrl: process.env.QSTASH_URL, // Set this in GCP to https://qstash.upstash.io or your specific region URL to avoid Anycast EU routing issues
})

// The public URL of the autopost-worker Cloud Run service
const WORKER_URL = process.env.WORKER_SERVICE_URL || 'http://localhost:8080'

/**
 * Enqueue a job by publishing it to a worker endpoint via QStash.
 * QStash will deliver the payload as an HTTP POST with retries.
 */
export async function enqueueJob(
  endpoint: string,
  data: Record<string, unknown>,
  options?: { retries?: number; deduplicationId?: string }
) {
  const response = await qstash.publishJSON({
    url: `${WORKER_URL}${endpoint}`,
    body: data,
    retries: options?.retries ?? 3,
    deduplicationId: options?.deduplicationId,
  })

  console.log(`[qstash] Enqueued job to ${endpoint}: messageId=${response.messageId}`)
  return response
}
