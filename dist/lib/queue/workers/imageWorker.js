"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const runware_1 = require("@/lib/api/runware");
const storage_1 = require("@/lib/gcs/storage");
const prisma_1 = require("@/lib/db/prisma");
const renderTrigger_1 = require("@/lib/queue/workers/renderTrigger");
const axios_1 = __importDefault(require("axios"));
// ── Redis Connection ─────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Image Generation Worker ──────────────────────────
exports.imageWorker = new bullmq_1.Worker('image-generation', async (job) => {
    const { videoId, userId, segmentIndex, imagePrompt, negativePrompt, seed, model, totalSegments, } = job.data;
    console.log(`[imageWorker] Generating image for segment ${segmentIndex} of ${videoId}`);
    try {
        // 1. Generate image via Runware
        const result = await (0, runware_1.generateImage)({
            positivePrompt: imagePrompt,
            negativePrompt,
            width: 1024,
            height: 1792,
            seed,
            model,
        });
        // 2. Download image from returned URL
        const response = await axios_1.default.get(result.imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
        });
        const imageBuffer = Buffer.from(response.data);
        // 3. Generate GCS key and upload
        const gcsKey = (0, storage_1.generateSegmentKey)(userId, videoId, 'image', segmentIndex, 'webp');
        const gcsUrl = await (0, storage_1.uploadBuffer)(imageBuffer, gcsKey, 'image/webp');
        // 4. Update video imageUrls array at correct index
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { imageUrls: true },
        });
        const currentUrls = video?.imageUrls ?? [];
        // Ensure array is long enough
        const newUrls = [...currentUrls];
        while (newUrls.length <= segmentIndex) {
            newUrls.push('');
        }
        newUrls[segmentIndex] = gcsUrl;
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { imageUrls: newUrls },
        });
        // 5. Calculate and update progress
        const completedCount = newUrls.filter((url) => !!url && url.length > 0).length;
        const progress = Math.round(20 + (completedCount / totalSegments) * 35);
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: { progress },
        });
        // 6. Check if all assets ready to trigger render
        await (0, renderTrigger_1.checkAndTriggerRender)(videoId, userId);
        console.log(`[imageWorker] Image ${segmentIndex} done for ${videoId} (${completedCount}/${totalSegments})`);
        return { success: true, gcsUrl, segmentIndex };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[imageWorker] Image generation failed for segment ${segmentIndex} of ${videoId}: ${message}`);
        // Don't fail the entire video for a single image failure
        // The retry mechanism in BullMQ will handle retries
        throw error;
    }
}, {
    connection,
    concurrency: 3,
});
exports.imageWorker.on('failed', (job, error) => {
    console.error(`[imageWorker] Job ${job?.id} failed:`, error.message);
});
exports.imageWorker.on('completed', (job) => {
    console.log(`[imageWorker] Job ${job.id} completed`);
});
