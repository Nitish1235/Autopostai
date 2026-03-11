// ── AutoPost AI Worker Entry Point ────────────────────
// This file starts all BullMQ workers when the
// worker container boots via Dockerfile.worker.

import 'module-alias/register'
import http from 'http'

import { scriptWorker } from './scriptWorker'
import { imageWorker } from './imageWorker'
import { voiceWorker } from './voiceWorker'
import { renderWorker } from './renderWorker'
import { publishWorker } from './publishWorker'
import { aiVideoWorker } from './aiVideoWorker'

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  AutoPost AI workers started')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// DEBUG LOGS FOR ENV VARS IN CLOUDRUN
console.log('[DEBUG] Available ENV VAR keys in container:', Object.keys(process.env).sort().join(', '))
console.log('[DEBUG] Checking specifically for REDIS_URL:', !!process.env.REDIS_URL, process.env.REDIS_URL ? 'PRESENT' : 'MISSING')
console.log('[DEBUG] Checking specifically for UPSTASH:', Object.keys(process.env).filter(k => k.includes('UPSTASH')).join(', '))


console.log(`[worker] Script worker initialized (concurrency: 1)`)
console.log(`[worker] Image worker initialized (concurrency: 3)`)
console.log(`[worker] Voice worker initialized (concurrency: 2)`)
console.log(`[worker] Render worker initialized (concurrency: 1)`)
console.log(`[worker] Publish worker initialized (concurrency: 2)`)
console.log(`[worker] AI Video worker initialized (concurrency: 2)`)

// ── Health Check Server (Cloud Run requirement) ──────

const PORT = 8080
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('AutoPost AI Worker is running!')
})

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[worker] Port ${PORT} already in use. Skipping server initialization.`)
  } else {
    console.error('[worker] Server error:', err)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[worker] Health check server listening on port ${PORT} at 0.0.0.0`)
})

// ── Graceful Shutdown ────────────────────────────────

async function shutdown() {
  console.log('[worker] Shutting down workers gracefully...')
  await Promise.all([
    scriptWorker.close(),
    imageWorker.close(),
    voiceWorker.close(),
    renderWorker.close(),
    publishWorker.close(),
    aiVideoWorker.close(),
  ])

  server.close(() => {
    console.log('[worker] Health check server closed.')
  })

  console.log('[worker] All workers closed. Exiting.')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('[worker] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[worker] Unhandled rejection:', reason)
})
