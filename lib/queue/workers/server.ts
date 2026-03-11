// ── Worker HTTP Server ────────────────────────────────
// Replaces the BullMQ polling workers with an Express HTTP
// server. QStash delivers jobs as HTTP POST requests.

import 'module-alias/register'
import http from 'http'
import { handleScriptJob } from './scriptWorker'
import { handleImageJob } from './imageWorker'
import { handleVoiceJob } from './voiceWorker'
import { handleRenderJob } from './renderWorker'
import { handlePublishJob } from './publishWorker'
import { handleAiVideoJob } from './aiVideoWorker'

const PORT = Number(process.env.PORT) || 8080

// ── Simple JSON body parser ──────────────────────────

async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        resolve(raw ? JSON.parse(raw) : {})
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
    const body = await parseBody(req)
    console.log(`[worker] Received job on ${url}:`, JSON.stringify(body).slice(0, 200))

    // Execute the job handler
    const result = await handler(body)

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
