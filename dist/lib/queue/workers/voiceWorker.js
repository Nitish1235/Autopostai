"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const unrealSpeech_1 = require("@/lib/api/unrealSpeech");
const prisma_1 = require("@/lib/db/prisma");
const renderTrigger_1 = require("@/lib/queue/workers/renderTrigger");
// ── Redis Connection ─────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Voice Generation Worker ──────────────────────────
exports.voiceWorker = new bullmq_1.Worker('voice-generation', async (job) => {
    const { videoId, userId, segmentIndex, narration, voiceId, voiceSpeed, totalSegments, } = job.data;
    console.log(`[voiceWorker] Generating voice for segment ${segmentIndex} of ${videoId}`);
    try {
        // 1. Generate voice and upload to GCS
        const result = await (0, unrealSpeech_1.generateVoiceAndUpload)({
            text: narration,
            voiceId,
            speed: voiceSpeed,
            userId,
            videoId,
            segmentIndex,
        });
        // 2. Update segment in Video.script JSON
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { script: true },
        });
        if (!video?.script) {
            throw new Error(`Video script not found for ${videoId}`);
        }
        const script = video.script;
        const updatedScript = script.map((seg, idx) => {
            if (idx === segmentIndex) {
                return {
                    ...seg,
                    audioUrl: result.gcsUrl,
                    wordTimestamps: result.words,
                    duration: result.duration,
                };
            }
            return seg;
        });
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                script: updatedScript,
            },
        });
        // 3. Calculate voice progress
        const completedVoice = updatedScript.filter((seg) => !!seg.audioUrl && seg.audioUrl.length > 0).length;
        // Voice contributes up to 25% of total render progress (from 20% to 45%)
        // But images also contribute, so we don't update progress here
        // The renderTrigger will handle final progress
        console.log(`[voiceWorker] Voice ${segmentIndex} done for ${videoId} (${completedVoice}/${totalSegments})`);
        // 4. Check if all assets ready to trigger render
        await (0, renderTrigger_1.checkAndTriggerRender)(videoId, userId);
        return {
            success: true,
            gcsUrl: result.gcsUrl,
            segmentIndex,
            duration: result.duration,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[voiceWorker] Voice generation failed for segment ${segmentIndex} of ${videoId}: ${message}`);
        // Try to mark the segment as failed in script JSON
        try {
            const video = await prisma_1.prisma.video.findUnique({
                where: { id: videoId },
                select: { script: true },
            });
            if (video?.script) {
                const script = video.script;
                const updatedScript = script.map((seg, idx) => {
                    if (idx === segmentIndex) {
                        return { ...seg, audioUrl: '', error: message };
                    }
                    return seg;
                });
                await prisma_1.prisma.video.update({
                    where: { id: videoId },
                    data: {
                        script: updatedScript,
                    },
                });
            }
        }
        catch {
            // Non-critical: if we can't mark it, that's okay
        }
        throw error;
    }
}, {
    connection,
    concurrency: 2,
});
exports.voiceWorker.on('failed', (job, error) => {
    console.error(`[voiceWorker] Job ${job?.id} failed:`, error.message);
});
exports.voiceWorker.on('completed', (job) => {
    console.log(`[voiceWorker] Job ${job.id} completed`);
});
