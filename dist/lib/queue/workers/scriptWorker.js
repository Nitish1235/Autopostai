"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const openai_1 = require("@/lib/api/openai");
const prisma_1 = require("@/lib/db/prisma");
const credits_1 = require("@/lib/utils/credits");
const videoQueue_1 = require("@/lib/queue/videoQueue");
const imagePrompt_1 = require("@/lib/prompts/imagePrompt");
const runware_1 = require("@/lib/api/runware");
// ── Redis Connection ─────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Script Generation Worker ─────────────────────────
exports.scriptWorker = new bullmq_1.Worker('script-generation', async (job) => {
    const { videoId, userId, topic, niche, format, imageStyle, voiceId, voiceSpeed, } = job.data;
    console.log(`[scriptWorker] Starting script generation for ${videoId}`);
    try {
        // 1. Update status
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { status: 'generating_script' },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: { stage: 'script', progress: 5, startedAt: new Date() },
        });
        // 2. Generate script via GPT-4o
        const result = await (0, openai_1.generateScript)({ topic, niche, format });
        // 3. Update video with script
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                title: result.title,
                script: result.segments,
                status: 'generating_images',
                imageUrls: new Array(result.segments.length).fill(''),
            },
        });
        // 4. Update render progress
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: { stage: 'images', progress: 20 },
        });
        // 5. Generate shared seed for visual consistency
        const seed = Math.floor(Math.random() * 2147483647);
        // 6. Queue image generation jobs
        for (let index = 0; index < result.segments.length; index++) {
            const segment = result.segments[index];
            const fullPositivePrompt = (0, imagePrompt_1.buildImagePrompt)(segment.imagePrompt, imageStyle, seed + index);
            const styleNegative = imagePrompt_1.STYLE_NEGATIVES[imageStyle] ?? '';
            const fullNegativePrompt = styleNegative
                ? `${imagePrompt_1.NEGATIVE_PROMPT}, ${styleNegative}`
                : imagePrompt_1.NEGATIVE_PROMPT;
            const imageJobData = {
                videoId,
                userId,
                segmentIndex: index,
                imagePrompt: fullPositivePrompt,
                negativePrompt: fullNegativePrompt,
                imageStyle,
                seed: seed + index,
                model: (0, runware_1.getModelForStyle)(imageStyle),
                totalSegments: result.segments.length,
            };
            await videoQueue_1.imageQueue.add(`image-${videoId}-${index}`, imageJobData, { jobId: `image-${videoId}-${index}` });
        }
        // 7. Queue voice generation jobs in parallel
        for (let index = 0; index < result.segments.length; index++) {
            const segment = result.segments[index];
            const voiceJobData = {
                videoId,
                userId,
                segmentIndex: index,
                narration: segment.narration,
                voiceId,
                voiceSpeed,
                totalSegments: result.segments.length,
            };
            await videoQueue_1.voiceQueue.add(`voice-${videoId}-${index}`, voiceJobData, { jobId: `voice-${videoId}-${index}` });
        }
        console.log(`[scriptWorker] Script done. Queued ${result.segments.length} image jobs and ${result.segments.length} voice jobs.`);
        return { success: true, segmentCount: result.segments.length };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[scriptWorker] Failed for video ${videoId}: ${message}`);
        // Update video and render job to failed
        const failedVideo = await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { status: 'failed', errorMessage: message },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: { status: 'failed', errorMessage: message },
        });
        // BUG FIX #10: Refund credit for autopilot-generated videos
        if (failedVideo.topicQueueId) {
            await (0, credits_1.addCredits)(failedVideo.userId, 1, 'refund', 'Script generation failed — autopilot credit returned').catch((e) => console.error('[scriptWorker] Credit refund failed:', e));
        }
        throw error;
    }
}, {
    connection,
    concurrency: 1,
});
exports.scriptWorker.on('failed', (job, error) => {
    console.error(`[scriptWorker] Job ${job?.id} failed:`, error.message);
});
exports.scriptWorker.on('completed', (job) => {
    console.log(`[scriptWorker] Job ${job.id} completed`);
});
