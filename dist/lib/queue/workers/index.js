"use strict";
// ── AutoPost AI Worker Entry Point ────────────────────
// This file starts all BullMQ workers when the
// worker container boots via Dockerfile.worker.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const http_1 = __importDefault(require("http"));
const scriptWorker_1 = require("./scriptWorker");
const imageWorker_1 = require("./imageWorker");
const voiceWorker_1 = require("./voiceWorker");
const renderWorker_1 = require("./renderWorker");
const publishWorker_1 = require("./publishWorker");
const aiVideoWorker_1 = require("./aiVideoWorker");
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  AutoPost AI workers started');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`[worker] Script worker initialized (concurrency: 1)`);
console.log(`[worker] Image worker initialized (concurrency: 3)`);
console.log(`[worker] Voice worker initialized (concurrency: 2)`);
console.log(`[worker] Render worker initialized (concurrency: 1)`);
console.log(`[worker] Publish worker initialized (concurrency: 2)`);
console.log(`[worker] AI Video worker initialized (concurrency: 2)`);
// ── Health Check Server (Cloud Run requirement) ──────
const PORT = process.env.PORT || 8080;
const server = http_1.default.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('AutoPost AI Worker is running!');
});
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[worker] Health check server listening on port ${PORT} at 0.0.0.0`);
});
// ── Graceful Shutdown ────────────────────────────────
async function shutdown() {
    console.log('[worker] Shutting down workers gracefully...');
    await Promise.all([
        scriptWorker_1.scriptWorker.close(),
        imageWorker_1.imageWorker.close(),
        voiceWorker_1.voiceWorker.close(),
        renderWorker_1.renderWorker.close(),
        publishWorker_1.publishWorker.close(),
        aiVideoWorker_1.aiVideoWorker.close(),
    ]);
    server.close(() => {
        console.log('[worker] Health check server closed.');
    });
    console.log('[worker] All workers closed. Exiting.');
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Keep the process alive
process.on('uncaughtException', (error) => {
    console.error('[worker] Uncaught exception:', error);
});
process.on('unhandledRejection', (reason) => {
    console.error('[worker] Unhandled rejection:', reason);
});
