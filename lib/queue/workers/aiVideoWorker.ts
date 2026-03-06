import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'
import type { AiVideoJobData } from '@/lib/queue/videoQueue'
import {
    buildSoraPrompt,
    generateVideo,
    pollUntilComplete,
    downloadAndUploadVideo,
} from '@/lib/api/crunai'
import { generateVoice } from '@/lib/api/unrealSpeech'
import { getMusicPath } from '@/lib/music/selector'
import {
    buildAudioMixCommand,
    buildFinalMuxCommand,
} from '@/lib/ffmpeg/audioMix'
import { uploadFromPath, generateVideoKey } from '@/lib/gcs/storage'
import { AI_VIDEO_DURATION } from '@/lib/utils/constants'
import axios from 'axios'

const execFileAsync = promisify(execFile)

// ── Redis Connection ──────────────────────────────────
const connection = new Redis(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
})

// ── AI Video Worker ───────────────────────────────────

async function processAiVideoJob(job: Job<AiVideoJobData>) {
    const {
        videoId,
        userId,
        topic,
        niche,
        imageStyle,
        format,
        aiAudioMode,
        voiceId,
        voiceSpeed,
        musicMood,
        musicVolume,
    } = job.data

    const startTime = Date.now()

    // Create temp dir for this job
    const tmpDir = path.join(os.tmpdir(), `ai-video-${videoId}`)
    await mkdir(tmpDir, { recursive: true })

    try {
        // ── Phase 1: Generate video from Crun AI ────────────

        await updateProgress(videoId, 'ai_generate', 5)
        await prisma.video.update({
            where: { id: videoId },
            data: { status: 'generating_script' },
        })

        // Build Sora 2 prompt
        const prompt = buildSoraPrompt({ topic, niche, imageStyle, format })

        await prisma.video.update({
            where: { id: videoId },
            data: { aiVideoPrompt: prompt },
        })

        await updateProgress(videoId, 'ai_generate', 10)

        // Submit generation to Crun AI
        const { taskId } = await generateVideo({
            prompt,
            duration: AI_VIDEO_DURATION.default,
        })

        console.log(`[aiVideoWorker] Task ${taskId} submitted for video ${videoId}`)
        await updateProgress(videoId, 'rendering', 15)

        // Poll until complete (5 min timeout, 15s intervals)
        const result = await pollUntilComplete(taskId, 300000, 15000)
        console.log(`[aiVideoWorker] Task ${taskId} completed: ${result.videoUrl}`)

        await updateProgress(videoId, 'rendering', 55)

        // ── Phase 2: Handle audio ───────────────────────────

        let finalVideoUrl: string

        if (aiAudioMode === 'replace') {
            // ── REPLACE MODE: Mute AI audio → generate voice → mix music → mux ──

            await updateProgress(videoId, 'generating_voice', 60)
            await prisma.video.update({
                where: { id: videoId },
                data: { status: 'generating_voice' },
            })

            // 2a. Download the Sora 2 video to local temp
            const rawVideoPath = path.join(tmpDir, 'sora_raw.mp4')
            const videoResponse = await axios.get(result.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
            })
            await writeFile(rawVideoPath, Buffer.from(videoResponse.data))

            // Store the raw AI audio for reference
            await prisma.video.update({
                where: { id: videoId },
                data: { aiRawAudioUrl: result.videoUrl },
            })

            // 2b. Generate voiceover from topic using UnrealSpeech TTS
            const voiceResult = await generateVoice({
                text: topic,
                voiceId: voiceId ?? 'ryan',
                speed: voiceSpeed ?? 1.0,
            })

            const voicePath = path.join(tmpDir, 'voice.mp3')
            await writeFile(voicePath, voiceResult.audioBuffer)

            await updateProgress(videoId, 'generating_voice', 70)

            // 2c. Get background music path
            const musicPath = getMusicPath(musicMood ?? 'upbeat', videoId)

            // 2d. Mix voice + music → mixed_audio.aac
            const mixedAudioPath = path.join(tmpDir, 'mixed_audio.aac')
            const mixArgs = buildAudioMixCommand({
                voicePath,
                musicPath,
                outputPath: mixedAudioPath,
                musicVolume: musicVolume ?? 0.3,
                voiceVolume: 1.0,
                totalDuration: result.duration,
            })

            await execFileAsync('ffmpeg', mixArgs)
            console.log(`[aiVideoWorker] Audio mixed for ${videoId}`)

            await updateProgress(videoId, 'rendering', 80)

            // 2e. Mux: strip original audio + add mixed audio → final.mp4
            const finalPath = path.join(tmpDir, 'final.mp4')
            const muxArgs = buildFinalMuxCommand({
                videoPath: rawVideoPath,
                audioPath: mixedAudioPath,
                outputPath: finalPath,
                duration: result.duration,
            })

            await execFileAsync('ffmpeg', muxArgs)
            console.log(`[aiVideoWorker] Final mux complete for ${videoId}`)

            await updateProgress(videoId, 'rendering', 90)

            // 2f. Upload final video to GCS
            const videoKey = generateVideoKey(userId, videoId)
            finalVideoUrl = await uploadFromPath(finalPath, videoKey, 'video/mp4')
        } else {
            // ── KEEP_AI MODE: Just download and upload the Sora 2 video as-is ──

            await updateProgress(videoId, 'rendering', 70)

            const { gcsVideoUrl } = await downloadAndUploadVideo({
                videoUrl: result.videoUrl,
                userId,
                videoId,
            })

            finalVideoUrl = gcsVideoUrl
        }

        await updateProgress(videoId, 'rendering', 95)

        // ── Phase 3: Finalize ─────────────────────────────

        const processingMs = Date.now() - startTime

        await prisma.video.update({
            where: { id: videoId },
            data: {
                aiVideoUrl: finalVideoUrl,
                videoUrl: finalVideoUrl,
                aiAudioMode: aiAudioMode,
                status: 'ready',
                processingMs,
            },
        })

        await prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'complete',
                stage: 'complete',
                progress: 100,
                completedAt: new Date(),
            },
        })

        await inngest.send({
            name: 'video/ready',
            data: { videoId, userId },
        })

        console.log(`[aiVideoWorker] Video ${videoId} ready in ${processingMs}ms (mode: ${aiAudioMode})`)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[aiVideoWorker] Failed for video ${videoId}:`, message)

        await prisma.video.update({
            where: { id: videoId },
            data: {
                status: 'failed',
                errorMessage: message,
                processingMs: Date.now() - startTime,
            },
        })

        await prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'failed',
                errorMessage: message,
            },
        })

        throw error
    } finally {
        // Clean up temp files
        try {
            const { rm } = await import('fs/promises')
            await rm(tmpDir, { recursive: true, force: true })
        } catch {
            // Non-critical cleanup
        }
    }
}

// ── Helper ────────────────────────────────────────────

async function updateProgress(
    videoId: string,
    stage: string,
    progress: number
) {
    await prisma.renderJob.update({
        where: { videoId },
        data: { stage, progress, status: 'processing' },
    })
}

// ── Create Worker ─────────────────────────────────────

export const aiVideoWorker = new Worker(
    'ai-video-generation',
    processAiVideoJob,
    {
        connection,
        concurrency: 2,
    }
)

aiVideoWorker.on('failed', (job, error) => {
    console.error(`[aiVideoWorker] Job ${job?.id} failed:`, error.message)
})

aiVideoWorker.on('completed', (job) => {
    console.log(`[aiVideoWorker] Job ${job.id} completed`)
})
