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

import { getMotionForSegment, buildImageClipCommand } from './kenBurns'
import {
  getTransitionForStyle,
  getTransitionDuration,
  buildConcatWithTransitions,
  buildSimpleConcat,
} from './transitions'
import {
  buildASSStyle,
  buildWordEvents,
  buildASSFile,
  writeASSFile,
} from './subtitles'
import {
  buildVoiceConcatCommand,
  buildAudioMixCommand,
  buildFinalMuxCommand,
  buildColorGradeCommand,
  buildThumbnailCommand,
} from './audioMix'

import type { ScriptSegment, SubtitleConfig } from '@/types'

const execFileAsync = promisify(execFile)

// ── FFmpeg Execution Helper ──────────────────────────

export async function execFFmpeg(args: string[]): Promise<void> {
  try {
    const { stdout, stderr } = await execFileAsync('ffmpeg', args, {
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

    // Download images
    for (let index = 0; index < imageUrls.length; index++) {
      const url = imageUrls[index]
      if (!url) continue

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })
      const imgPath = path.join(workDir, `img_${index}.webp`)
      fs.writeFileSync(imgPath, Buffer.from(response.data))
    }

    // Download master voice audio
    console.log(`[render] Downloading master audio for ${videoId}`)
    const masterVoicePath = path.join(workDir, 'voice_master.mp3')
    if (masterAudioUrl) {
      try {
        const response = await axios.get(masterAudioUrl, {
          responseType: 'arraybuffer',
          timeout: 45000,
        })
        fs.writeFileSync(masterVoicePath, Buffer.from(response.data))
      } catch (err) {
        console.error(`[render] Failed to download master audio:`, err)
      }
    }

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

    // ── STEP 2: Ken Burns clips ────────────────────────

    await updateProgress(videoId, 65, 'render')
    console.log(`[render] Creating Ken Burns clips for ${videoId}`)

    const seed = videoId.charCodeAt(0) + videoId.charCodeAt(1)
    const imageClipPaths: string[] = []
    const clipDurations: number[] = []

    // ── Calculate global Image Duration based on Master Audio ──
    let masterVoiceDuration = 15.0 // fallback
    if (masterWordTimestamps && masterWordTimestamps.length > 0) {
      const lastWord = masterWordTimestamps[masterWordTimestamps.length - 1] as any
      masterVoiceDuration = (lastWord.end ?? lastWord.start ?? 14.5) + 0.5
    }

    // Number of visual scenes corresponds directly to imageUrls/script length
    const totalScenes = script.length > 0 ? script.length : imageUrls.length
    
    // The exact duration each image will stay on screen to perfectly match the entire audio length
    const imageDuration = totalScenes > 0 ? (masterVoiceDuration / totalScenes) : 5.0
    console.log(`[render] Global audio duration: ${masterVoiceDuration}s. Unified image duration: ${imageDuration.toFixed(2)}s per scene.`)

    for (let index = 0; index < script.length; index++) {
      const imgPath = path.join(workDir, `img_${index}.webp`)
      const clipPath = path.join(workDir, `clip_${index}.mp4`)
      const duration = imageDuration

      // FIX #6/#7: If image is missing, generate a solid black frame instead of
      // skipping. This keeps audio and video perfectly in sync regardless of
      // image download failures.
      if (!fs.existsSync(imgPath)) {
        console.warn(`[render] Image not found for segment ${index} — generating black frame`)
        try {
          await execFFmpeg([
            '-f', 'lavfi',
            '-i', `color=c=black:s=1080x1920:r=30:d=${duration}`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '28',
            '-y', clipPath,
          ])
          imageClipPaths.push(clipPath)
          clipDurations.push(duration)
        } catch (blackErr) {
          console.error(`[render] Black frame fallback also failed for segment ${index}:`, blackErr)
        }
        continue
      }

      const motion = getMotionForSegment(index, imageStyle, seed)
      const command = buildImageClipCommand({
        inputPath: imgPath,
        outputPath: clipPath,
        duration,
        motion,
        segmentIndex: index,
        imageStyle,
      })

      await execFFmpeg(command)
      imageClipPaths.push(clipPath)
      clipDurations.push(duration)
    }

    await updateProgress(videoId, 72)

    // ── STEP 3: Concat clips with transitions ──────────

    console.log(`[render] Concatenating clips for ${videoId}`)
    const concatPath = path.join(workDir, 'video_raw.mp4')
    const transitionType = getTransitionForStyle(imageStyle)
    const transitionDuration = getTransitionDuration(format)

    try {
      const concatCommand = buildConcatWithTransitions({
        clipPaths: imageClipPaths,
        clipDurations,
        outputPath: concatPath,
        transitionType,
        transitionDuration,
        fps: 30,
      })
      await execFFmpeg(concatCommand)
    } catch {
      // Fallback to simple concat
      console.log(`[render] Transition concat failed, using simple concat`)
      const simpleCommand = buildSimpleConcat(imageClipPaths, concatPath)
      await execFFmpeg(simpleCommand)
    }

    await updateProgress(videoId, 78)

    // ── STEP 4: Audio Concat (Skiped) ──────────────────────────
    // Because we migrated to a Single Master Audio Track, we no longer need to 
    // stitch together individual segment chunk MP3s using the concat filter.
    // The master file `voice_master.mp3` is perfectly sequenced out of the box.

    // ── STEP 5: Mix voice + music ──────────────────────

    console.log(`[render] Mixing audio for ${videoId}`)
    const totalDuration = clipDurations.reduce((a, b) => a + b, 0)
    const mixedAudioPath = path.join(workDir, 'audio_mixed.aac')

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
    }

    await updateProgress(videoId, 83)

    // ── STEP 6: Mux video + audio ──────────────────────

    console.log(`[render] Muxing video + audio for ${videoId}`)
    const muxedPath = path.join(workDir, 'video_muxed.mp4')

    if (fs.existsSync(mixedAudioPath)) {
      const muxCmd = buildFinalMuxCommand({
        videoPath: concatPath,
        audioPath: mixedAudioPath,
        outputPath: muxedPath,
        duration: totalDuration,
      })
      await execFFmpeg(muxCmd)
    } else {
      // No audio — just copy video
      fs.copyFileSync(concatPath, muxedPath)
    }

    console.log(`[render] Burning subtitles for ${videoId}`)

    // Since we generate a single Unified Audio Track now, the `masterWordTimestamps`
    // natively contains perfect global timings spanning from 0s -> End of Video.
    // We perfectly bypass `offsetSegmentTimestamps()` which introduced desync padding drift.
    const rawWords = (masterWordTimestamps || []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }))

    const allWordTimestamps = convertToFrameTimestamps(rawWords, 30)

    // Build ASS file
    const style = buildASSStyle(subtitleConfig)
    const events = buildWordEvents({
      wordTimestamps: allWordTimestamps,
      subtitleConfig,
      fps: 30,
    })

    const assPath = path.join(workDir, 'subtitles.ass')
    const assContent = buildASSFile({
      events,
      style,
      videoWidth: 1080,
      videoHeight: 1920,
    })
    await writeASSFile(assContent, assPath)

    const subtitledPath = path.join(workDir, 'video_subtitled.mp4')

    if (events.length > 0) {
      // Escape the path for FFmpeg ass filter
      const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
      await execFFmpeg([
        '-i', muxedPath,
        '-vf', `ass=${escapedAssPath}`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'copy',
        '-y', subtitledPath,
      ])
    } else {
      // No subtitles — just copy
      fs.copyFileSync(muxedPath, subtitledPath)
    }

    await updateProgress(videoId, 90)

    // ── STEP 8: Color grade + grain ────────────────────

    console.log(`[render] Applying color grade for ${videoId}`)
    const gradedPath = path.join(workDir, 'video_graded.mp4')
    const gradeCmd = buildColorGradeCommand({
      inputPath: subtitledPath,
      outputPath: gradedPath,
      imageStyle,
    })
    await execFFmpeg(gradeCmd)

    await updateProgress(videoId, 94)

    // ── STEP 9: Extract thumbnail ──────────────────────

    console.log(`[render] Extracting thumbnail for ${videoId}`)
    const thumbPath = path.join(workDir, 'thumbnail.jpg')
    const thumbCmd = buildThumbnailCommand({
      videoPath: gradedPath,
      outputPath: thumbPath,
      timeOffset: 3,
    })
    await execFFmpeg(thumbCmd)

    // ── STEP 10: Upload to GCS ─────────────────────────

    await updateProgress(videoId, 96, 'uploading')
    console.log(`[render] Uploading to GCS for ${videoId}`)

    const videoKey = generateVideoKey(userId, videoId)
    const thumbKey = generateThumbnailKey(userId, videoId)

    const videoUrl = await uploadFromPath(gradedPath, videoKey, 'video/mp4')
    const thumbnailUrl = await uploadFromPath(thumbPath, thumbKey, 'image/jpeg')

    // ── STEP 11: Update DB ─────────────────────────────

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
    // ── STEP 12: Cleanup temp files ────────────────────

    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch {
      console.warn(`[render] Cleanup failed for ${workDir}`)
    }
  }
}
