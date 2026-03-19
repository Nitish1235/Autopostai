import axios from 'axios'
import { CRUN_AI_MODELS, AI_VIDEO_DURATION } from '@/lib/utils/constants'
import {
    uploadBuffer,
    generateVideoKey,
    generateMasterAudioKey,
} from '@/lib/gcs/storage'

// ── Config ────────────────────────────────────────────
const BASE_URL = process.env.CRUN_AI_BASE_URL ?? 'https://api.crun.ai/api/v1/client/job'
const API_KEY = process.env.CRUN_AI_API_KEY ?? ''

// ── Types ─────────────────────────────────────────────

interface CrunCreateTaskResponse {
    code: number
    message: string
    data: {
        task_id: string
    }
}

interface CrunTaskResult {
    code?: number
    message?: string
    media_urls?: string[]
}

interface CrunTaskInfoResponse {
    code: number
    message: string
    data: {
        task_id: string
        provider: string
        model_version: string
        status: 'pending' | 'running' | 'success' | 'failed'
        param: {
            model: string
            callback_url: string | null
            input: Record<string, unknown>
        }
        result: CrunTaskResult | null
        duration_s: number | null
        create_at: number
        complete_at: number | null
        source: string
    }
}

// ── Style → Prompt Descriptor Maps ───────────────────

const STYLE_DESCRIPTORS: Record<string, string> = {
    cinematic: 'Anamorphic cinematic footage, teal-orange color grade, film grain',
    anime: 'Animated in Studio Ghibli style, soft colors, hand-drawn aesthetic',
    dark_fantasy: 'Dark cinematic atmosphere, volumetric lighting, dramatic shadows',
    cyberpunk: 'Neon-lit futuristic city scene, rain-slicked streets, RGB glow',
    documentary: 'Documentary-style handheld footage, natural lighting, realistic',
    vintage: 'Vintage film aesthetic, kodachrome colors, analog grain, warm tones',
    '3d_render': 'Photorealistic 3D rendered scene, studio lighting, clean modern',
    minimal: 'Minimalist clean visuals, soft even lighting, modern aesthetic',
}

const NICHE_SCENES: Record<string, string> = {
    finance: 'businessman, wealth, city skyline, charts, modern office',
    health: 'fitness, nature, healthy lifestyle, movement, energy',
    tech: 'technology, innovation, digital, futuristic interface, data',
    mindset: 'motivation, achievement, sunrise, determination, success journey',
    history: 'historical setting, period accurate, dramatic recreation, epic scale',
    science: 'scientific visualization, cosmos, laboratory, discovery, wonder',
    mystery: 'dark atmosphere, suspense, shadows, thriller aesthetic, unknown',
}

const DEFAULT_SCENE = 'engaging visual storytelling, dynamic composition'

// ── Exported Functions ────────────────────────────────

/**
 * Build an optimized Sora 2 prompt from user config.
 */
export function buildSoraPrompt(params: {
    topic: string
    niche: string
    imageStyle: string
    format: string
}): string {
    const style = STYLE_DESCRIPTORS[params.imageStyle] ?? STYLE_DESCRIPTORS.cinematic
    const scene = NICHE_SCENES[params.niche] ?? DEFAULT_SCENE

    const prompt = [
        style + '.',
        `Scene about: ${params.topic}.`,
        `Visual elements: ${scene}.`,
        'Smooth camera movement, cinematic quality.',
        'Vertical format, 9:16 aspect ratio,',
        'no text overlays, no subtitles, no watermarks,',
        'suitable for social media short video.',
    ].join(' ')

    // Cap at 500 characters
    return prompt.slice(0, 500)
}

/**
 * Submit a video generation task to Crun AI.
 */
export async function generateVideo(params: {
    prompt: string
    duration?: number
}): Promise<{ taskId: string }> {
    const duration = params.duration ?? AI_VIDEO_DURATION.default

    let response;
    try {
        response = await axios.post<CrunCreateTaskResponse>(
            `${BASE_URL}/CreateTask`,
            {
                model: CRUN_AI_MODELS.sora2,
                input: {
                    prompt: params.prompt,
                    aspect_ratio: '9:16',
                    resolution: '720p',
                    seconds: duration,
                },
            },
            {
                headers: {
                    'X-API-KEY': API_KEY,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        )
    } catch (error: any) {
        if (error.response?.data) {
            throw new Error(`Crun AI HTTP 422 Error Payload: ${JSON.stringify(error.response.data)}`)
        }
        throw error;
    }

    if (response.data.code !== 200) {
        throw new Error(`Crun AI create task failed: ${response.data.message}`)
    }

    return { taskId: response.data.data.task_id }
}

/**
 * Get current status of a Crun AI generation task.
 */
export async function getVideoStatus(taskId: string): Promise<CrunTaskInfoResponse['data']> {
    const response = await axios.get<CrunTaskInfoResponse>(
        `${BASE_URL}/TaskInfo`,
        {
            params: { task_id: taskId },
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        }
    )

    if (response.data.code !== 200) {
        throw new Error(`Crun AI task info failed: ${response.data.message}`)
    }

    return response.data.data
}

/**
 * Poll until a Crun AI task completes or fails.
 */
export async function pollUntilComplete(
    taskId: string,
    timeoutMs: number = 300000,   // 5 minutes
    intervalMs: number = 15000    // 15 seconds
): Promise<{ videoUrl: string; duration: number }> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        const task = await getVideoStatus(taskId)

        if (task.status === 'success') {
            const mediaUrls = task.result?.media_urls
            if (!mediaUrls || mediaUrls.length === 0) {
                throw new Error('Crun AI generation succeeded but no media URLs returned')
            }

            return {
                videoUrl: mediaUrls[0],
                duration: task.duration_s ?? AI_VIDEO_DURATION.default,
            }
        }

        if (task.status === 'failed') {
            const errorMsg = task.result?.message ?? 'Unknown error'
            throw new Error(`Crun AI generation failed: ${errorMsg}`)
        }

        // Still pending or running — wait and retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Crun AI generation timed out after ${timeoutMs / 1000}s`)
}

/**
 * Download video from Crun AI and upload to GCS.
 */
export async function downloadAndUploadVideo(params: {
    videoUrl: string
    userId: string
    videoId: string
}): Promise<{ gcsVideoUrl: string }> {
    // Download video buffer from Crun AI
    const videoResponse = await axios.get(params.videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 min timeout for large files
    })

    const videoBuffer = Buffer.from(videoResponse.data)
    const videoKey = generateVideoKey(params.userId, params.videoId)
    const gcsVideoUrl = await uploadBuffer(videoBuffer, videoKey, 'video/mp4')

    return { gcsVideoUrl }
}
