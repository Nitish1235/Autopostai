// ── Video Transitions ────────────────────────────────

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { KenBurnsMotion, getMotionForSegment, buildKenBurnsFilter } from './kenBurns'

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
  // As requested, default everything to a simple fade/crossfade to the next image for now
  // to avoid repetitive stylistic loops like sliding left 10 times in a row.
  return 'crossfade'
}

// export function getTransitionForStyle(imageStyle: string): TransitionType {
//    switch (imageStyle) {
//     case 'cinematic':
//       return 'crossfade'
//     case 'dark_fantasy':
//       return 'fade_black'
//     case 'anime':
//       return 'crossfade'
//     case 'cyberpunk':
//       return 'slide_left'
//     case 'documentary':
//       return 'crossfade'
//     case 'vintage':
//       return 'dip_black'
//     case '3d_render':
//       return 'fade_white'
//     case 'minimal':
//       return 'fade_white'
//     default:
//   // As requested, default everything to a simple fade/crossfade to the next image for now
//   // to avoid repetitive stylistic loops like sliding left 10 times in a row.
//   return 'crossfade'
// }

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

// ── Build Color Grade Filter String ──────────────────

export function getColorGradeFilter(imageStyle: string): string {
  switch (imageStyle) {
    case 'cinematic':
      return "curves=r='0/0 0.3/0.25 0.7/0.75 1/1':g='0/0 0.3/0.28 0.7/0.72 1/1':b='0/0 0.3/0.32 0.7/0.68 1/1',noise=alls=8:allf=t"
    case 'dark_fantasy':
      return "curves=master='0/0 0.5/0.4 1/0.9',noise=alls=6:allf=t"
    case 'vintage':
      return "curves=r='0/0.1 0.5/0.55 1/0.9':b='0/0.05 0.5/0.45 1/0.8',noise=alls=10:allf=t"
    case 'cyberpunk':
      return "hue=s=1.4,curves=r='0/0 0.5/0.45 1/0.9':b='0/0.1 0.5/0.55 1/1',noise=alls=5:allf=t"
    default:
      return "unsharp=5:5:0.8:3:3:0.4,noise=alls=4:allf=t"
  }
}

// ── Build Mega Filter Complex ─────────────────────────

export function buildMegaRenderCommand(params: {
  imagePaths: string[]
  durations: number[]
  motions: KenBurnsMotion[]
  audioPath: string
  outputPath: string
  transitionType: TransitionType
  transitionDuration: number
  imageStyle: string
  assSubtitlePath?: string
  fps?: number
}): string[] {
  const {
    imagePaths,
    durations,
    motions,
    audioPath,
    outputPath,
    transitionType,
    transitionDuration,
    imageStyle,
    assSubtitlePath,
    fps = 30,
  } = params

  if (imagePaths.length === 0) {
    throw new Error('No images provided for concatenation')
  }

  const inputArgs: string[] = []
  imagePaths.forEach((p, i) => {
    // Limit input duration slightly to prevent infinite loops before filter applies
    inputArgs.push('-loop', '1', '-t', (durations[i] + 1).toString(), '-i', p)
  })

  // Audio is the last input
  const audioInputIndex = imagePaths.length
  inputArgs.push('-i', audioPath)

  const filterParts: string[] = []

  // Step 1: Ken Burns on each image
  for (let i = 0; i < imagePaths.length; i++) {
    const kenBurns = buildKenBurnsFilter({
      motion: motions[i],
      duration: durations[i],
      fps,
      width: 1080,
      height: 1920,
    })

    // Convert duration to frames exactly
    const durationFrames = Math.ceil(durations[i] * fps)

    filterParts.push(
      `[${i}:v]scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,${kenBurns},scale=1080:1920,setsar=1,settb=1/${fps},format=yuv420p,trim=duration=${durations[i]}[v${i}]`
    )
  }

  // Step 2: Xfade transitions
  const xfadeType = XFADE_MAP[transitionType] ?? 'fade'
  let prevLabel = 'v0'
  let cumulativeOffset = 0

  if (imagePaths.length > 1) {
    for (let i = 1; i < imagePaths.length; i++) {
      cumulativeOffset += durations[i - 1]
      const offset = Math.max(0, cumulativeOffset - i * transitionDuration)

      const outputLabel = i === imagePaths.length - 1 ? 'vout_xfade' : `v_concat${i}`

      filterParts.push(
        `[${prevLabel}][v${i}]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outputLabel}]`
      )
      prevLabel = outputLabel
    }
  } else {
    // If only one image, just pass it through
    filterParts.push(`[v0]copy[vout_xfade]`)
    prevLabel = 'vout_xfade'
  }

  // Step 3: Color Grading & Subtitles
  const colorGrade = getColorGradeFilter(imageStyle)

  let finalEffectsFilter = colorGrade

  if (assSubtitlePath) {
    // Escape the path for FFmpeg ass filter
    const escapedAssPath = assSubtitlePath.replace(/\\/g, '/').replace(/:/g, '\\\\:')
    // Fonts directory
    const fontsDir = path.join(process.cwd(), 'assets', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\\\:')
    // Subtitles ALWAYS go last after color grading to prevent distortion
    finalEffectsFilter += `,ass='${escapedAssPath}':fontsdir='${fontsDir}'`
  }

  filterParts.push(`[${prevLabel}]${finalEffectsFilter}[vout_final]`)

  const filterComplex = filterParts.join(';')

  return [
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[vout_final]',
    '-map', `${audioInputIndex}:a`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'copy', // we just mixed the audio, no need to re-encode
    '-shortest',    // Audio will be slightly longer or shorter, cap at shortest track
    '-movflags', '+faststart',
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

