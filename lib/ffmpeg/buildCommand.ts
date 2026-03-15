// ── Main Video Render Orchestrator ────────────────────

import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

import { prisma } from '@/lib/db/prisma'
import {
  uploadFromPath,
  generateVideoKey,
  generateThumbnailKey,
} from '@/lib/gcs/storage'
import { getMusicPath } from '@/lib/music/selector'
import { convertToFrameTimestamps } from '@/lib/utils/timestamps'

import { getMotionForSegment, KenBurnsMotion } from './kenBurns'
import {
  getTransitionForStyle,
  getTransitionDuration,
  buildMegaRenderCommand
} from './transitions'
import {
  buildASSStyle,
  buildWordEvents,
  buildASSFile,
  writeASSFile,
} from './subtitles'
import {
  buildAudioMixCommand,
  buildThumbnailCommand,
} from './audioMix'

import type { ScriptSegment, SubtitleConfig } from '@/types'

const execFileAsync = promisify(execFile)

// ── FFmpeg Execution Helper ──────────────────────────

export async function execFFmpeg(args: string[]): Promise<void> {
  try {
    // Add -threads 0 to allow FFmpeg to use all available cores
    const fullArgs = ['-threads', '0', ...args]
    
    const { stdout, stderr } = await execFileAsync('ffmpeg', fullArgs, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600000, // 10 minute timeout per step
    })

    if (process.env.NODE_ENV === 'development') {
      if (stdout) console.log('[ffmpeg stdout]', stdout.slice(0, 500))
      if (stderr) console.log('[ffmpeg stderr]', stderr.slice(0, 500))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown FFmpeg error'
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr: string }).stderr).slice(0, 1000)
        : ''
    throw new Error(`FFmpeg failed: ${message}\n${stderr}`)
  }
}

// ── Update Render Progress ───────────────────────────

async function updateProgress(
  videoId: string,
  progress: number,
  stage?: string
): Promise<void> {
  const data: Record<string, unknown> = { progress }
  if (stage) data.stage = stage

  await prisma.renderJob.update({
    where: { videoId },
    data,
  })
}

// ── Main Render Function ─────────────────────────────

export async function renderVideo(params: {
  videoId: string
  userId: string
  imageUrls: string[]
  script: ScriptSegment[]
  subtitleConfig: SubtitleConfig
  musicMood: string
  musicVolume: number
  format: string
  imageStyle: string
  masterAudioUrl: string
  masterWordTimestamps: any[]
}): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const {
    videoId,
    userId,
    imageUrls,
    script,
    subtitleConfig,
    musicMood,
    musicVolume,
    format,
    imageStyle,
    masterAudioUrl,
    masterWordTimestamps,
  } = params

  const workDir = path.join('/tmp', 'renders', videoId)
  fs.mkdirSync(workDir, { recursive: true })

  const startTime = Date.now()

  try {
    // ── STEP 1: Download all assets ────────────────────

    await updateProgress(videoId, 62, 'downloading')
    console.log(`[render] Downloading assets for ${videoId}`)

    // Download images concurrently
    const imageDownloads = imageUrls.map(async (url, index) => {
        if (!url) return null;
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
            })
            const imgPath = path.join(workDir, `img_${index}.webp`)
            fs.writeFileSync(imgPath, Buffer.from(response.data))
            return imgPath
        } catch (error) {
            console.error(`[render] Failed to download image ${index}:`, error)
            return null
        }
    })

    // Download master voice audio
    console.log(`[render] Downloading master audio for ${videoId}`)
    const masterVoicePath = path.join(workDir, 'voice_master.mp3')
    const audioDownload = masterAudioUrl 
        ? axios.get(masterAudioUrl, { responseType: 'arraybuffer', timeout: 45000 })
            .then(res => fs.writeFileSync(masterVoicePath, Buffer.from(res.data)))
            .catch(err => console.error(`[render] Failed to download master audio:`, err))
        : Promise.resolve()

    await Promise.all([...imageDownloads, audioDownload])

    // Get music path
    let musicPath: string
    try {
      musicPath = getMusicPath(musicMood, videoId)
    } catch {
      // Fallback: create silent audio if no music file
      const silentPath = path.join(workDir, 'silence.mp3')
      await execFFmpeg([
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', '1',
        '-c:a', 'libmp3lame',
        '-y', silentPath,
      ])
      musicPath = silentPath
    }
    
    // ── STEP 2: Prepare Timings & Subtitles ────────────────────────

    await updateProgress(videoId, 70, 'preparing')
    console.log(`[render] Preparing timeline and subtitles for ${videoId}`)

    const seed = videoId.charCodeAt(0) + videoId.charCodeAt(1)
    
    // Calculate global Image Duration based on Master Audio
    let masterVoiceDuration = 15.0 // fallback
    if (masterWordTimestamps && masterWordTimestamps.length > 0) {
      const lastWord = masterWordTimestamps[masterWordTimestamps.length - 1] as any
      masterVoiceDuration = (lastWord.end ?? lastWord.start ?? 14.5) + 0.5
    }

    const totalScenes = script.length > 0 ? script.length : imageUrls.length
    const imageDuration = totalScenes > 0 ? (masterVoiceDuration / totalScenes) : 5.0
    console.log(`[render] Global audio duration: ${masterVoiceDuration}s. Unified image duration: ${imageDuration.toFixed(2)}s per scene.`)

    const activeImagePaths: string[] = []
    const clipDurations: number[] = []
    const motions: KenBurnsMotion[] = []

    for (let index = 0; index < totalScenes; index++) {
      const imgPath = path.join(workDir, `img_${index}.webp`)
      const duration = imageDuration

      if (!fs.existsSync(imgPath)) {
        console.warn(`[render] Image not found for segment ${index} — creating black frame`)
        // Create black frame on the fly
        const blackImgPath = path.join(workDir, `black_${index}.webp`)
        try {
            await execFFmpeg([
                '-f', 'lavfi',
                '-i', 'color=c=black:s=1080x1920:r=30:d=1',
                '-vframes', '1',
                '-y', blackImgPath
            ])
            activeImagePaths.push(blackImgPath)
        } catch {
             continue // if black frame generation fails skip completely
        }
      } else {
        activeImagePaths.push(imgPath)
      }
      clipDurations.push(duration)
      motions.push(getMotionForSegment(index, imageStyle, seed))
    }

    // Prepare Subtitles
    const rawWords = (masterWordTimestamps || []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }))

    const allWordTimestamps = convertToFrameTimestamps(rawWords, 30)

    const style = buildASSStyle(subtitleConfig)
    const events = buildWordEvents({
      wordTimestamps: allWordTimestamps,
      subtitleConfig,
      fps: 30,
    })

    let assPath: string | undefined = undefined
    if (events.length > 0) {
        assPath = path.join(workDir, 'subtitles.ass')
        const assContent = buildASSFile({
            events,
            style,
            videoWidth: 1080,
            videoHeight: 1920,
        })
        await writeASSFile(assContent, assPath)
    }

    // ── STEP 3: Mix voice + music ──────────────────────

    await updateProgress(videoId, 75, 'mixing_audio')
    console.log(`[render] Mixing audio for ${videoId}`)
    
    // We only need the mixed audio file
    const mixedAudioPath = path.join(workDir, 'audio_mixed.aac')
    const totalDuration = clipDurations.reduce((a, b) => a + b, 0)

    if (fs.existsSync(masterVoicePath)) {
      const audioMixCmd = buildAudioMixCommand({
        voicePath: masterVoicePath,
        musicPath,
        outputPath: mixedAudioPath,
        musicVolume,
        voiceVolume: 1.0,
        totalDuration,
      })
      await execFFmpeg(audioMixCmd)
    } else {
        // Just copy the music if no voice
        fs.copyFileSync(musicPath, mixedAudioPath)
    }

    // ── STEP 4: Single Mega Render Pass ──────────────────────

    await updateProgress(videoId, 80, 'rendering')
    console.log(`[render] Starting single-pass video render for ${videoId}`)
    
    const finalVideoPath = path.join(workDir, 'video_merged.mp4')
    const transitionType = getTransitionForStyle(imageStyle)
    const transitionDuration = getTransitionDuration(format)

    const megaCommand = buildMegaRenderCommand({
        imagePaths: activeImagePaths,
        durations: clipDurations,
        motions,
        audioPath: mixedAudioPath,
        outputPath: finalVideoPath,
        transitionType,
        transitionDuration,
        imageStyle,
        assSubtitlePath: assPath,
        fps: 30
    })

    await execFFmpeg(megaCommand)

    await updateProgress(videoId, 92)

    // ── STEP 5: Extract thumbnail ──────────────────────

    await updateProgress(videoId, 94, 'thumbnail')
    console.log(`[render] Extracting thumbnail for ${videoId}`)
    const thumbPath = path.join(workDir, 'thumbnail.jpg')
    const thumbCmd = buildThumbnailCommand({
      videoPath: finalVideoPath,
      outputPath: thumbPath,
      timeOffset: 3,
    })
    await execFFmpeg(thumbCmd)

    // ── STEP 6: Upload to GCS ─────────────────────────

    await updateProgress(videoId, 96, 'uploading')
    console.log(`[render] Uploading to GCS for ${videoId}`)

    const videoKey = generateVideoKey(userId, videoId)
    const thumbKey = generateThumbnailKey(userId, videoId)

    const videoUrl = await uploadFromPath(finalVideoPath, videoKey, 'video/mp4')
    const thumbnailUrl = await uploadFromPath(thumbPath, thumbKey, 'image/jpeg')

    // ── STEP 7: Update DB ─────────────────────────────

    const elapsed = Date.now() - startTime

    await prisma.video.update({
      where: { id: videoId },
      data: {
        videoUrl,
        thumbnailUrl,
        status: 'ready',
        processingMs: elapsed,
      },
    })

    await prisma.renderJob.update({
      where: { videoId },
      data: {
        status: 'complete',
        progress: 100,
        completedAt: new Date(),
        durationMs: elapsed,
      },
    })

    console.log(`[render] Complete for ${videoId} in ${elapsed}ms`)

    return { videoUrl, thumbnailUrl }
  } finally {
    // ── STEP 8: Cleanup temp files ────────────────────

    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch {
      console.warn(`[render] Cleanup failed for ${workDir}`)
    }
  }
}
