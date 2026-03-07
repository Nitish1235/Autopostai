"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiVideoWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const prisma_1 = require("@/lib/db/prisma");
const client_1 = require("@/lib/inngest/client");
const crunai_1 = require("@/lib/api/crunai");
const unrealSpeech_1 = require("@/lib/api/unrealSpeech");
const selector_1 = require("@/lib/music/selector");
const audioMix_1 = require("@/lib/ffmpeg/audioMix");
const storage_1 = require("@/lib/gcs/storage");
const constants_1 = require("@/lib/utils/constants");
const axios_1 = __importDefault(require("axios"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
// ── Redis Connection ──────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── AI Video Worker ───────────────────────────────────
async function processAiVideoJob(job) {
    const { videoId, userId, topic, niche, imageStyle, format, aiAudioMode, voiceId, voiceSpeed, musicMood, musicVolume, } = job.data;
    const startTime = Date.now();
    // Create temp dir for this job
    const tmpDir = path_1.default.join(os_1.default.tmpdir(), `ai-video-${videoId}`);
    await (0, promises_1.mkdir)(tmpDir, { recursive: true });
    try {
        // ── Phase 1: Generate video from Crun AI ────────────
        await updateProgress(videoId, 'ai_generate', 5);
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { status: 'generating_script' },
        });
        // Build Sora 2 prompt
        const prompt = (0, crunai_1.buildSoraPrompt)({ topic, niche, imageStyle, format });
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { aiVideoPrompt: prompt },
        });
        await updateProgress(videoId, 'ai_generate', 10);
        // Submit generation to Crun AI
        const { taskId } = await (0, crunai_1.generateVideo)({
            prompt,
            duration: constants_1.AI_VIDEO_DURATION.default,
        });
        console.log(`[aiVideoWorker] Task ${taskId} submitted for video ${videoId}`);
        await updateProgress(videoId, 'rendering', 15);
        // Poll until complete (5 min timeout, 15s intervals)
        const result = await (0, crunai_1.pollUntilComplete)(taskId, 300000, 15000);
        console.log(`[aiVideoWorker] Task ${taskId} completed: ${result.videoUrl}`);
        await updateProgress(videoId, 'rendering', 55);
        // ── Phase 2: Handle audio ───────────────────────────
        let finalVideoUrl;
        if (aiAudioMode === 'replace') {
            // ── REPLACE MODE: Mute AI audio → generate voice → mix music → mux ──
            await updateProgress(videoId, 'generating_voice', 60);
            await prisma_1.prisma.video.update({
                where: { id: videoId },
                data: { status: 'generating_voice' },
            });
            // 2a. Download the Sora 2 video to local temp
            const rawVideoPath = path_1.default.join(tmpDir, 'sora_raw.mp4');
            const videoResponse = await axios_1.default.get(result.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
            });
            await (0, promises_1.writeFile)(rawVideoPath, Buffer.from(videoResponse.data));
            // Store the raw AI audio for reference
            await prisma_1.prisma.video.update({
                where: { id: videoId },
                data: { aiRawAudioUrl: result.videoUrl },
            });
            // 2b. Generate voiceover from topic using UnrealSpeech TTS
            const voiceResult = await (0, unrealSpeech_1.generateVoice)({
                text: topic,
                voiceId: voiceId ?? 'ryan',
                speed: voiceSpeed ?? 1.0,
            });
            const voicePath = path_1.default.join(tmpDir, 'voice.mp3');
            await (0, promises_1.writeFile)(voicePath, voiceResult.audioBuffer);
            await updateProgress(videoId, 'generating_voice', 70);
            // 2c. Get background music path
            const musicPath = (0, selector_1.getMusicPath)(musicMood ?? 'upbeat', videoId);
            // 2d. Mix voice + music → mixed_audio.aac
            const mixedAudioPath = path_1.default.join(tmpDir, 'mixed_audio.aac');
            const mixArgs = (0, audioMix_1.buildAudioMixCommand)({
                voicePath,
                musicPath,
                outputPath: mixedAudioPath,
                musicVolume: musicVolume ?? 0.3,
                voiceVolume: 1.0,
                totalDuration: result.duration,
            });
            await execFileAsync('ffmpeg', mixArgs);
            console.log(`[aiVideoWorker] Audio mixed for ${videoId}`);
            await updateProgress(videoId, 'rendering', 80);
            // 2e. Mux: strip original audio + add mixed audio → final.mp4
            const finalPath = path_1.default.join(tmpDir, 'final.mp4');
            const muxArgs = (0, audioMix_1.buildFinalMuxCommand)({
                videoPath: rawVideoPath,
                audioPath: mixedAudioPath,
                outputPath: finalPath,
                duration: result.duration,
            });
            await execFileAsync('ffmpeg', muxArgs);
            console.log(`[aiVideoWorker] Final mux complete for ${videoId}`);
            await updateProgress(videoId, 'rendering', 90);
            // 2f. Upload final video to GCS
            const videoKey = (0, storage_1.generateVideoKey)(userId, videoId);
            finalVideoUrl = await (0, storage_1.uploadFromPath)(finalPath, videoKey, 'video/mp4');
        }
        else {
            // ── KEEP_AI MODE: Just download and upload the Sora 2 video as-is ──
            await updateProgress(videoId, 'rendering', 70);
            const { gcsVideoUrl } = await (0, crunai_1.downloadAndUploadVideo)({
                videoUrl: result.videoUrl,
                userId,
                videoId,
            });
            finalVideoUrl = gcsVideoUrl;
        }
        await updateProgress(videoId, 'rendering', 95);
        // ── Phase 3: Finalize ─────────────────────────────
        const processingMs = Date.now() - startTime;
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                aiVideoUrl: finalVideoUrl,
                videoUrl: finalVideoUrl,
                aiAudioMode: aiAudioMode,
                status: 'ready',
                processingMs,
            },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'complete',
                stage: 'complete',
                progress: 100,
                completedAt: new Date(),
            },
        });
        await client_1.inngest.send({
            name: 'video/ready',
            data: { videoId, userId },
        });
        console.log(`[aiVideoWorker] Video ${videoId} ready in ${processingMs}ms (mode: ${aiAudioMode})`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[aiVideoWorker] Failed for video ${videoId}:`, message);
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                status: 'failed',
                errorMessage: message,
                processingMs: Date.now() - startTime,
            },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'failed',
                errorMessage: message,
            },
        });
        throw error;
    }
    finally {
        // Clean up temp files
        try {
            const { rm } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await rm(tmpDir, { recursive: true, force: true });
        }
        catch {
            // Non-critical cleanup
        }
    }
}
// ── Helper ────────────────────────────────────────────
async function updateProgress(videoId, stage, progress) {
    await prisma_1.prisma.renderJob.update({
        where: { videoId },
        data: { stage, progress, status: 'processing' },
    });
}
// ── Create Worker ─────────────────────────────────────
exports.aiVideoWorker = new bullmq_1.Worker('ai-video-generation', processAiVideoJob, {
    connection,
    concurrency: 2,
});
exports.aiVideoWorker.on('failed', (job, error) => {
    console.error(`[aiVideoWorker] Job ${job?.id} failed:`, error.message);
});
exports.aiVideoWorker.on('completed', (job) => {
    console.log(`[aiVideoWorker] Job ${job.id} completed`);
});
