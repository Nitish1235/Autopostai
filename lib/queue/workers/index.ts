// ── AutoPost AI Worker Entry Point ────────────────────
// This file starts all BullMQ workers when the
// worker container boots via Dockerfile.worker.

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

console.log(`[worker] Script worker initialized (concurrency: 1)`)
console.log(`[worker] Image worker initialized (concurrency: 3)`)
console.log(`[worker] Voice worker initialized (concurrency: 2)`)
console.log(`[worker] Render worker initialized (concurrency: 1)`)
console.log(`[worker] Publish worker initialized (concurrency: 2)`)
console.log(`[worker] AI Video worker initialized (concurrency: 2)`)

// ── Health Check Server (Cloud Run requirement) ──────

const PORT = process.env.PORT || 8080
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('AutoPost AI Worker is running!')
})

server.listen(PORT, () => {
  console.log(`[worker] Health check server listening on port ${PORT}`)
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
