"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiVideoQueue = exports.publishQueue = exports.renderQueue = exports.voiceQueue = exports.imageQueue = exports.scriptQueue = void 0;
exports.addVideoToQueue = addVideoToQueue;
exports.getJobStatus = getJobStatus;
exports.addAiVideoToQueue = addAiVideoToQueue;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma_1 = require("@/lib/db/prisma");
// ── Redis Connection ──────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Queues ────────────────────────────────────────────
exports.scriptQueue = new bullmq_1.Queue('script-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
exports.imageQueue = new bullmq_1.Queue('image-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
exports.voiceQueue = new bullmq_1.Queue('voice-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
exports.renderQueue = new bullmq_1.Queue('video-render', {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
    },
});
exports.publishQueue = new bullmq_1.Queue('publish', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
exports.aiVideoQueue = new bullmq_1.Queue('ai-video-generation', {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 50,
        removeOnFail: 50,
    },
});
// ── Helper Functions ──────────────────────────────────
async function addVideoToQueue(videoId, userId, topic, niche, format, segmentCount, imageStyle, voiceId, voiceSpeed) {
    const jobData = {
        videoId,
        userId,
        topic,
        niche,
        format,
        segmentCount,
        imageStyle,
        voiceId,
        voiceSpeed,
    };
    await exports.scriptQueue.add(`script-${videoId}`, jobData, {
        jobId: `script-${videoId}`,
    });
    // Create RenderJob record in DB
    await prisma_1.prisma.renderJob.upsert({
        where: { videoId },
        create: {
            videoId,
            status: 'queued',
            stage: 'script',
            progress: 0,
        },
        update: {
            status: 'queued',
            stage: 'script',
            progress: 0,
            errorMessage: null,
            startedAt: null,
            completedAt: null,
        },
    });
    // Update video status
    await prisma_1.prisma.video.update({
        where: { id: videoId },
        data: {
            status: 'generating_script',
            renderJobId: videoId,
        },
    });
}
async function getJobStatus(videoId) {
    const renderJob = await prisma_1.prisma.renderJob.findUnique({
        where: { videoId },
    });
    if (!renderJob) {
        return { stage: 'unknown', progress: 0 };
    }
    return {
        stage: renderJob.stage ?? 'unknown',
        progress: renderJob.progress,
    };
}
async function addAiVideoToQueue(videoId, jobData) {
    await exports.aiVideoQueue.add(`ai-video-${videoId}`, jobData, {
        jobId: `ai-video-${videoId}`,
    });
    // Create RenderJob record in DB
    await prisma_1.prisma.renderJob.upsert({
        where: { videoId },
        create: {
            videoId,
            status: 'queued',
            stage: 'ai_generate',
            progress: 0,
        },
        update: {
            status: 'queued',
            stage: 'ai_generate',
            progress: 0,
            errorMessage: null,
            startedAt: null,
            completedAt: null,
        },
    });
    // Update video status
    await prisma_1.prisma.video.update({
        where: { id: videoId },
        data: {
            status: 'generating_script', // reuse existing status for initial phase
            renderJobId: videoId,
        },
    });
}
