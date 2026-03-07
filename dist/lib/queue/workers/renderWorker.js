"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const buildCommand_1 = require("@/lib/ffmpeg/buildCommand");
const prisma_1 = require("@/lib/db/prisma");
const credits_1 = require("@/lib/utils/credits");
const videoQueue_1 = require("@/lib/queue/videoQueue");
const client_1 = require("@/lib/inngest/client");
// ── Redis Connection ─────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Render Worker ────────────────────────────────────
exports.renderWorker = new bullmq_1.Worker('video-render', async (job) => {
    const { videoId, userId } = job.data;
    const startTime = Date.now();
    console.log(`[renderWorker] Starting render for videoId: ${videoId}`);
    try {
        // 1. Fetch full video from DB
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                status: true,
                format: true,
                imageStyle: true,
                script: true,
                imageUrls: true,
                subtitleConfig: true,
                musicMood: true,
                musicVolume: true,
                platforms: true,
                scheduledAt: true,
            },
        });
        if (!video) {
            throw new Error(`Video not found: ${videoId}`);
        }
        // 2. Parse script
        const script = video.script;
        if (!script || !Array.isArray(script) || script.length === 0) {
            throw new Error('Video script is empty or invalid');
        }
        // 3. Validate all required assets
        const imageCount = (video.imageUrls ?? []).filter((url) => !!url && url.length > 0).length;
        const voiceCount = script.filter((seg) => !!seg.audioUrl && seg.audioUrl.length > 0).length;
        if (imageCount !== script.length) {
            throw new Error(`Video assets incomplete: images ${imageCount}/${script.length}`);
        }
        if (voiceCount !== script.length) {
            throw new Error(`Video assets incomplete: voice ${voiceCount}/${script.length}`);
        }
        // 4. Update RenderJob status
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'processing',
                startedAt: new Date(),
            },
        });
        // 5. Execute render
        const result = await (0, buildCommand_1.renderVideo)({
            videoId,
            userId,
            imageUrls: video.imageUrls,
            script,
            subtitleConfig: video.subtitleConfig,
            musicMood: video.musicMood,
            musicVolume: video.musicVolume,
            format: video.format,
            imageStyle: video.imageStyle,
        });
        const elapsed = Date.now() - startTime;
        console.log(`[renderWorker] Render complete for ${videoId} in ${elapsed}ms`);
        // 6. Send Inngest event
        try {
            await client_1.inngest.send({
                name: 'video/ready',
                data: { videoId, userId },
            });
        }
        catch {
            // Non-critical
        }
        // 7. Check if we should publish immediately
        const shouldPublishNow = video.platforms.length > 0 &&
            (!video.scheduledAt || new Date(video.scheduledAt) <= new Date());
        if (shouldPublishNow) {
            await videoQueue_1.publishQueue.add(`publish-${videoId}`, {
                videoId,
                userId,
                platforms: video.platforms,
            }, { jobId: `publish-${videoId}` });
            console.log(`[renderWorker] Queued publish job for ${videoId}`);
        }
        return {
            success: true,
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl,
            elapsed,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown render error';
        console.error(`[renderWorker] Failed for video ${videoId}: ${message}`);
        // Update video and render job to failed
        const failedVideo = await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { status: 'failed', errorMessage: message },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'failed',
                errorMessage: message,
                completedAt: new Date(),
                durationMs: Date.now() - startTime,
            },
        });
        // BUG FIX #10: Refund credit for autopilot-generated videos
        if (failedVideo.topicQueueId) {
            await (0, credits_1.addCredits)(failedVideo.userId, 1, 'refund', 'Video render failed — autopilot credit returned').catch((e) => console.error('[renderWorker] Credit refund failed:', e));
        }
        throw error;
    }
}, {
    connection,
    concurrency: 1,
});
exports.renderWorker.on('failed', (job, error) => {
    console.error(`[renderWorker] Job ${job?.id} failed:`, error.message);
});
exports.renderWorker.on('completed', (job) => {
    console.log(`[renderWorker] Job ${job.id} completed`);
});
