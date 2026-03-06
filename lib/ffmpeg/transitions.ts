// ── Video Transitions ────────────────────────────────

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// ── Types ────────────────────────────────────────────

export type TransitionType =
  | 'crossfade'
  | 'fade_black'
  | 'fade_white'
  | 'slide_left'
  | 'slide_right'
  | 'zoom_blur'
  | 'dip_black'

export interface TransitionConfig {
  type: TransitionType
  duration: number
  fps: number
}

// ── Transition Type to FFmpeg xfade Map ──────────────

const XFADE_MAP: Record<TransitionType, string> = {
  crossfade: 'fade',
  fade_black: 'fadeblack',
  fade_white: 'fadewhite',
  slide_left: 'slideleft',
  slide_right: 'slideright',
  zoom_blur: 'zoominblur',
  dip_black: 'fadeblack',
}

// ── Get Transition for Style ─────────────────────────

export function getTransitionForStyle(imageStyle: string): TransitionType {
  switch (imageStyle) {
    case 'cinematic':
      return 'crossfade'
    case 'dark_fantasy':
      return 'fade_black'
    case 'anime':
      return 'crossfade'
    case 'cyberpunk':
      return 'slide_left'
    case 'documentary':
      return 'crossfade'
    case 'vintage':
      return 'dip_black'
    case '3d_render':
      return 'fade_white'
    case 'minimal':
      return 'fade_white'
    default:
      return 'crossfade'
  }
}

// ── Get Transition Duration ──────────────────────────

export function getTransitionDuration(format: string): number {
  switch (format) {
    case '30s':
      return 0.4
    case '60s':
      return 0.5
    case '90s':
      return 0.5
    default:
      return 0.4
  }
}

// ── Build Concat with Transitions ────────────────────

export function buildConcatWithTransitions(params: {
  clipPaths: string[]
  clipDurations: number[]
  outputPath: string
  transitionType: TransitionType
  transitionDuration: number
  fps: number
}): string[] {
  const {
    clipPaths,
    clipDurations,
    outputPath,
    transitionType,
    transitionDuration,
  } = params

  if (clipPaths.length === 0) {
    throw new Error('No clips provided for concatenation')
  }

  if (clipPaths.length === 1) {
    // Single clip — just copy
    return ['-i', clipPaths[0], '-c', 'copy', '-y', outputPath]
  }

  const xfadeType = XFADE_MAP[transitionType] ?? 'fade'

  // Build input args
  const inputArgs: string[] = []
  for (const clipPath of clipPaths) {
    inputArgs.push('-i', clipPath)
  }

  // Build xfade filter chain
  const filterParts: string[] = []
  let prevLabel = '0:v'
  let cumulativeOffset = 0

  for (let i = 1; i < clipPaths.length; i++) {
    // Offset = cumulative clip durations minus accumulated transitions
    cumulativeOffset += clipDurations[i - 1]
    const offset = Math.max(
      0,
      cumulativeOffset - i * transitionDuration
    )
    const outputLabel = i === clipPaths.length - 1 ? 'vout' : `v${i}`

    filterParts.push(
      `[${prevLabel}][${i}:v]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outputLabel}]`
    )

    prevLabel = outputLabel
  }

  const filterComplex = filterParts.join(';')

  return [
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-y',
    outputPath,
  ]
}

// ── Build Simple Concat (Fallback) ───────────────────

export function buildSimpleConcat(
  clipPaths: string[],
  outputPath: string
): string[] {
  // Create concat demuxer file
  const listFileName = `concat_${uuidv4()}.txt`
  const listFilePath = path.join(path.dirname(outputPath), listFileName)

  const listContent = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')

  fs.writeFileSync(listFilePath, listContent, 'utf-8')

  return [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFilePath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-y',
    outputPath,
  ]
}
