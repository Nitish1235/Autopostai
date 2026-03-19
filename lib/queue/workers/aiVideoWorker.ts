import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest/client'
import type { AiVideoJobData } from '@/lib/queue/videoQueue'
import {
    buildWanPrompt,
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

// ── AI Video Handler ─────────────────────────────────

export async function handleAiVideoJob(data: AiVideoJobData) {
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
    } = data

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

        // Build Wan 2.5 prompt
        const prompt = buildWanPrompt({ topic, niche, imageStyle, format })

        await prisma.video.update({
            where: { id: videoId },
            data: { aiVideoPrompt: prompt },
        })

        await updateProgress(videoId, 'ai_generate', 10)

        // Submit generation to Crun AI
        const { taskId } = await generateVideo({
            prompt,
            duration: data.aiDuration ?? AI_VIDEO_DURATION.default,
        })

        console.log(`[aiVideoWorker] Task ${taskId} submitted for video ${videoId}`)
        await updateProgress(videoId, 'rendering', 15)

        // Poll until complete (5 min timeout, 15s intervals)
        const result = await pollUntilComplete(taskId, 300000, 15000)
        console.log(`[aiVideoWorker] Task ${taskId} completed: ${result.videoUrl}`)

        await updateProgress(videoId, 'rendering', 55)

        // ── Phase 2: Handle audio ───────────────────────────

        let finalVideoUrl: string

        if (aiAudioMode === 'replace' && !data.skipAudio) {
            await updateProgress(videoId, 'generating_voice', 60)
            await prisma.video.update({
                where: { id: videoId },
                data: { status: 'generating_voice' },
            })

            // Download the Wan 2.5 video to local temp
            const rawVideoPath = path.join(tmpDir, 'wan_raw.mp4')
            const videoResponse = await axios.get(result.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
            })
            await writeFile(rawVideoPath, Buffer.from(videoResponse.data))

            await prisma.video.update({
                where: { id: videoId },
                data: { aiRawAudioUrl: result.videoUrl },
            })

            // Generate voiceover
            const voiceResult = await generateVoice({
                text: topic,
                voiceId: voiceId ?? 'ryan',
                speed: voiceSpeed ?? 1.0,
            })

            const voicePath = path.join(tmpDir, 'voice.mp3')
            await writeFile(voicePath, voiceResult.audioBuffer)

            await updateProgress(videoId, 'generating_voice', 70)

            // // Get background music path
            // const musicPath = getMusicPath(musicMood ?? 'upbeat', videoId)

            // // Mix voice + music
            // const mixedAudioPath = path.join(tmpDir, 'mixed_audio.aac')
            // const mixArgs = buildAudioMixCommand({
            //     voicePath,
            //     musicPath,
            //     outputPath: mixedAudioPath,
            //     musicVolume: musicVolume ?? 0.3,
            //     voiceVolume: 1.0,
            //     totalDuration: result.duration,
            // })

            // await execFileAsync('ffmpeg', mixArgs)
            // console.log(`[aiVideoWorker] Audio mixed for ${videoId}`)

            await updateProgress(videoId, 'rendering', 80)

            // Mux: strip original audio + add voice audio
            const finalPath = path.join(tmpDir, 'final.mp4')
            const muxArgs = buildFinalMuxCommand({
                videoPath: rawVideoPath,
                audioPath: voicePath,
                outputPath: finalPath,
                duration: result.duration,
            })

            await execFileAsync('ffmpeg', muxArgs)
            console.log(`[aiVideoWorker] Final mux complete for ${videoId}`)

            await updateProgress(videoId, 'rendering', 90)

            // Upload final video to GCS
            const videoKey = generateVideoKey(userId, videoId)
            finalVideoUrl = await uploadFromPath(finalPath, videoKey, 'video/mp4')
        } else {
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

        // Check if we should set status to ready or scheduled
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { scheduledAt: true }
        })
        
        const nextStatus = (video?.scheduledAt && video.scheduledAt > new Date()) 
            ? 'scheduled' 
            : 'ready'

        await prisma.video.update({
            where: { id: videoId },
            data: {
                aiVideoUrl: finalVideoUrl,
                videoUrl: finalVideoUrl,
                aiAudioMode: aiAudioMode,
                status: nextStatus,
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
