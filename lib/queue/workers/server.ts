// ── Worker HTTP Server ────────────────────────────────
// Replaces the BullMQ polling workers with an Express HTTP
// server. QStash delivers jobs as HTTP POST requests.

import 'module-alias/register'
import http from 'http'
import { Receiver } from '@upstash/qstash'
import { handleScriptJob } from './scriptWorker'
import { handleImageJob } from './imageWorker'
import { handleVoiceJob } from './voiceWorker'
import { handleRenderJob } from './renderWorker'
import { handlePublishJob } from './publishWorker'
import { handleAiVideoJob } from './aiVideoWorker'

const PORT = Number(process.env.PORT) || 8080

// ── QStash Signature Verification ────────────────────
// Ensures that only QStash (not random attackers) can invoke worker endpoints.

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
})

const isDev = !process.env.QSTASH_CURRENT_SIGNING_KEY

async function verifyQStashSignature(req: http.IncomingMessage, rawBody: string): Promise<boolean> {
  // Skip verification in development (no signing keys configured)
  if (isDev) {
    console.log('[worker] ⚠️ DEV MODE: Skipping QStash signature verification')
    return true
  }

  const signature = req.headers['upstash-signature'] as string
  if (!signature) {
    console.error('[worker] ❌ Missing Upstash-Signature header')
    return false
  }

  try {
    await receiver.verify({
      signature,
      body: rawBody,
    })
    return true
  } catch (error) {
    console.error('[worker] ❌ QStash signature verification failed:', error)
    return false
  }
}

// ── Simple JSON body parser ──────────────────────────

async function parseBody(req: http.IncomingMessage): Promise<{ raw: string; parsed: any }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        resolve({ raw, parsed: raw ? JSON.parse(raw) : {} })
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

// ── Route Handler Map ────────────────────────────────

const handlers: Record<string, (data: any) => Promise<any>> = {
  '/jobs/script': handleScriptJob,
  '/jobs/image': handleImageJob,
  '/jobs/voice': handleVoiceJob,
  '/jobs/render': handleRenderJob,
  '/jobs/publish': handlePublishJob,
  '/jobs/ai-video': handleAiVideoJob,
  // Also accept /api/jobs/* paths (from Next.js app dispatch)
  '/api/jobs/script': handleScriptJob,
  '/api/jobs/image': handleImageJob,
  '/api/jobs/voice': handleVoiceJob,
  '/api/jobs/render': handleRenderJob,
  '/api/jobs/publish': handlePublishJob,
  '/api/jobs/ai-video': handleAiVideoJob,
}

// ── HTTP Server ──────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = req.url ?? '/'
  const method = req.method ?? 'GET'

  // Health check
  if (url === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('AutoPost AI Worker is running!')
    return
  }

  // Job endpoints — POST only
  if (method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const handler = handlers[url]
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unknown endpoint' }))
    return
  }

  try {
    // Parse the QStash payload
    const { raw, parsed } = await parseBody(req)

    // Verify QStash signature before executing any job
    const isValid = await verifyQStashSignature(req, raw)
    if (!isValid) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized — invalid QStash signature' }))
      return
    }

    console.log(`[worker] Received job on ${url}:`, JSON.stringify(parsed).slice(0, 200))

    // Execute the job handler
    const result = await handler(parsed)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, result }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[worker] Job failed on ${url}:`, message)

    // Return 500 so QStash will retry
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: message }))
  }
})

// ── Start Server ─────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  AutoPost AI Worker (QStash HTTP)`)
  console.log(`  Listening on port ${PORT}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Routes:`)
  Object.keys(handlers).forEach((route) => {
    console.log(`    POST ${route}`)
  })
})

// ── Graceful Shutdown ────────────────────────────────

function shutdown() {
  console.log('[worker] Shutting down...')
  server.close(() => {
    console.log('[worker] Server closed. Exiting.')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('uncaughtException', (error) => {
  console.error('[worker] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[worker] Unhandled rejection:', reason)
})
