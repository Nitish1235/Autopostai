// ── Audio Mixing — Voice + Music ─────────────────────

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// ── Concatenate Voice Segments ───────────────────────

export function buildVoiceConcatCommand(params: {
  audioPaths: string[]
  outputPath: string
}): string[] {
  const { audioPaths, outputPath } = params

  // Write concat list file
  const listFileName = `audiolist_${uuidv4()}.txt`
  const listFilePath = path.join(path.dirname(outputPath), listFileName)

  const listContent = audioPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')

  fs.writeFileSync(listFilePath, listContent, 'utf-8')

  return [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFilePath,
    '-c', 'copy',
    '-y',
    outputPath,
  ]
}

// ── Mix Voice + Background Music ─────────────────────

export function buildAudioMixCommand(params: {
  voicePath: string
  musicPath: string
  outputPath: string
  musicVolume: number
  voiceVolume: number
  totalDuration: number
}): string[] {
  const {
    voicePath,
    musicPath,
    outputPath,
    musicVolume,
    voiceVolume,
    totalDuration,
  } = params

  const fadeStart = Math.max(0, totalDuration - 2)

  const filterComplex =
    `[0:a]volume=${voiceVolume}[voice];` +
    `[1:a]volume=${musicVolume},` +
    `aloop=loop=-1:size=2e+09,` +
    `atrim=duration=${totalDuration},` +
    `afade=t=out:st=${fadeStart.toFixed(2)}:d=2[music];` +
    `[voice][music]amix=inputs=2:duration=first[aout]`

  return [
    '-i', voicePath,
    '-i', musicPath,
    '-filter_complex', filterComplex,
    '-map', '[aout]',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-y',
    outputPath,
  ]
}

// ── Mux Video + Audio ────────────────────────────────

export function buildFinalMuxCommand(params: {
  videoPath: string
  audioPath: string
  outputPath: string
  duration: number
}): string[] {
  const { videoPath, audioPath, outputPath } = params

  return [
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ]
}

// ── Color Grade + Film Grain ─────────────────────────

export function buildColorGradeCommand(params: {
  inputPath: string
  outputPath: string
  imageStyle: string
}): string[] {
  const { inputPath, outputPath, imageStyle } = params

  let filterChain: string

  switch (imageStyle) {
    case 'cinematic':
      filterChain =
        "curves=r='0/0 0.3/0.25 0.7/0.75 1/1':" +
        "g='0/0 0.3/0.28 0.7/0.72 1/1':" +
        "b='0/0 0.3/0.32 0.7/0.68 1/1'," +
        'noise=alls=8:allf=t'
      break

    case 'dark_fantasy':
      filterChain =
        "curves=master='0/0 0.5/0.4 1/0.9'," +
        'noise=alls=6:allf=t'
      break

    case 'vintage':
      filterChain =
        "curves=r='0/0.1 0.5/0.55 1/0.9':" +
        "b='0/0.05 0.5/0.45 1/0.8'," +
        'noise=alls=10:allf=t'
      break

    case 'cyberpunk':
      filterChain =
        'hue=s=1.4,' +
        "curves=r='0/0 0.5/0.45 1/0.9':" +
        "b='0/0.1 0.5/0.55 1/1'," +
        'noise=alls=5:allf=t'
      break

    default:
      // Light sharpen + subtle grain for all other styles
      filterChain =
        'unsharp=5:5:0.8:3:3:0.4,' +
        'noise=alls=4:allf=t'
      break
  }

  return [
    '-i', inputPath,
    '-vf', filterChain,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'copy',
    '-y',
    outputPath,
  ]
}

// ── Extract Thumbnail ────────────────────────────────

export function buildThumbnailCommand(params: {
  videoPath: string
  outputPath: string
  timeOffset?: number
}): string[] {
  const { videoPath, outputPath, timeOffset } = params

  return [
    '-i', videoPath,
    '-ss', (timeOffset ?? 3).toString(),
    '-vframes', '1',
    '-q:v', '2',
    '-vf', 'scale=540:960',
    '-y',
    outputPath,
  ]
}
