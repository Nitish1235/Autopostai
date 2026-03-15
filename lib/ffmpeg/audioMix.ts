// ── Audio Mixing — Voice + Music ─────────────────────

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

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

  // Use a simpler, highly stable filtergraph for voice + background music.
  // The background music loops indefinitely. amix naturally terminates when the shortest input (voice) ends
  // because we use `duration=shortest` instead of `duration=first`.
  const filterComplex = 
    `[0:a]volume=${voiceVolume}[v];` +
    `[1:a]volume=${musicVolume},aloop=loop=-1:size=2147483647,afade=t=out:st=${fadeStart.toFixed(2)}:d=2[m];` +
    `[v][m]amix=inputs=2:duration=shortest[aout]`

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

// ── Mux Video + Audio (Used by aiVideoWorker) ────────

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
