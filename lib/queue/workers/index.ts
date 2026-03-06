// ── AutoPost AI Worker Entry Point ────────────────────
// This file starts all BullMQ workers when the
// worker container boots via Dockerfile.worker.

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
