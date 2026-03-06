// ── ASS Subtitle Builder — Word-by-Word Highlighting ──

import { writeFile } from 'fs/promises'
import type { SubtitleConfig, WordTimestamp, SubtitleFont } from '@/types'

// ── Types ────────────────────────────────────────────

interface ASSEvent {
  start: string
  end: string
  text: string
}

interface ASSStyle {
  name: string
  fontName: string
  fontSize: number
  primaryColor: string
  secondaryColor: string
  outlineColor: string
  backColor: string
  bold: boolean
  italic: boolean
  underline: boolean
  scaleX: number
  scaleY: number
  spacing: number
  borderStyle: number
  outline: number
  shadow: number
  alignment: number
  marginL: number
  marginR: number
  marginV: number
}

// ── Font Name Map ────────────────────────────────────

const FONT_NAME_MAP: Record<SubtitleFont, string> = {
  impact: 'Impact',
  inter: 'Inter',
  bebas: 'Bebas Neue',
  caveat: 'Caveat',
  playfair: 'Playfair Display',
  mono: 'JetBrains Mono',
  nunito: 'Nunito',
  barlow: 'Barlow Condensed',
  cormorant: 'Cormorant Garamond',
  marker: 'Permanent Marker',
}

// ── Hex to ASS Color ─────────────────────────────────

export function hexToASSColor(hex: string, alpha: number = 0): string {
  // Strip leading #
  const clean = hex.replace('#', '')

  // Parse RGB
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)

  // ASS format: &HAABBGGRR (BGR order, alpha 0=opaque, FF=transparent)
  const alphaHex = alpha.toString(16).padStart(2, '0').toUpperCase()
  const blueHex = b.toString(16).padStart(2, '0').toUpperCase()
  const greenHex = g.toString(16).padStart(2, '0').toUpperCase()
  const redHex = r.toString(16).padStart(2, '0').toUpperCase()

  return `&H${alphaHex}${blueHex}${greenHex}${redHex}`
}

// ── Build ASS Style ──────────────────────────────────

export function buildASSStyle(subtitleConfig: SubtitleConfig): ASSStyle {
  const fontName = FONT_NAME_MAP[subtitleConfig.font] ?? 'Inter'

  // Alignment: ASS numpad style (bottom: 1=left, 2=center, 3=right)
  let alignment = 2
  switch (subtitleConfig.alignment) {
    case 'left':
      alignment = 1
      break
    case 'center':
      alignment = 2
      break
    case 'right':
      alignment = 3
      break
  }

  // MarginV: distance from bottom
  // position 0 = near bottom (40px), position 100 = near top
  const marginV = Math.round(
    40 + (subtitleConfig.position / 100) * (1920 - 80 - subtitleConfig.fontSize)
  )

  // Background color with opacity for border style 3 (box)
  const bgAlpha = Math.round((1 - subtitleConfig.bgOpacity) * 255)

  return {
    name: 'Default',
    fontName,
    fontSize: subtitleConfig.fontSize,
    primaryColor: hexToASSColor(subtitleConfig.primaryColor),
    secondaryColor: hexToASSColor(subtitleConfig.activeColor),
    outlineColor: hexToASSColor(subtitleConfig.strokeColor),
    backColor: subtitleConfig.backgroundBox
      ? hexToASSColor(subtitleConfig.bgColor, bgAlpha)
      : hexToASSColor('#000000', 255),
    bold: false,
    italic: false,
    underline: false,
    scaleX: 100,
    scaleY: 100,
    spacing: 0,
    borderStyle: subtitleConfig.backgroundBox ? 3 : 1,
    outline: subtitleConfig.strokeWidth,
    shadow: subtitleConfig.shadow ? 2 : 0,
    alignment,
    marginL: 40,
    marginR: 40,
    marginV,
  }
}

// ── Frames to ASS Time ───────────────────────────────

export function framesToTime(frames: number, fps: number): string {
  const totalSeconds = frames / fps
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const centiseconds = Math.round((totalSeconds % 1) * 100)

  return (
    `${hours}:` +
    `${minutes.toString().padStart(2, '0')}:` +
    `${seconds.toString().padStart(2, '0')}.` +
    `${centiseconds.toString().padStart(2, '0')}`
  )
}

// ── Seconds to ASS Time ──────────────────────────────

function secondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const centiseconds = Math.round((totalSeconds % 1) * 100)

  return (
    `${hours}:` +
    `${minutes.toString().padStart(2, '0')}:` +
    `${seconds.toString().padStart(2, '0')}.` +
    `${centiseconds.toString().padStart(2, '0')}`
  )
}

// ── Build Phrase Text with Highlighting ──────────────

function buildPhraseText(
  words: WordTimestamp[],
  activeIndex: number,
  config: SubtitleConfig
): string {
  const parts: string[] = []

  for (let i = 0; i < words.length; i++) {
    let wordText = config.uppercase
      ? words[i].word.toUpperCase()
      : words[i].word

    if (i === activeIndex) {
      // Active word — accent color
      const activeColor = hexToASSColor(config.activeColor)
      let prefix = `{\\c${activeColor}}`
      let suffix = '{\\r}'

      // Pop animation: scale up active word
      if (config.animation === 'pop') {
        prefix = `{\\c${activeColor}\\fscx120\\fscy120}`
        suffix = '{\\fscx100\\fscy100\\r}'
      }

      // Bounce animation
      if (config.animation === 'bounce') {
        prefix = `{\\c${activeColor}\\fscx115\\fscy115}`
        suffix = '{\\fscx100\\fscy100\\r}'
      }

      // Bold active word for emphasis
      prefix = `{\\b1}` + prefix
      suffix = suffix + `{\\b0}`

      // First word accent (different color for first word)
      if (i === 0 && config.firstWordAccent) {
        const accentColor = hexToASSColor(config.accentColor)
        prefix = `{\\b1\\c${accentColor}\\fscx120\\fscy120}`
        suffix = '{\\fscx100\\fscy100\\r\\b0}'
      }

      parts.push(`${prefix}${wordText}${suffix}`)
    } else if (i < activeIndex) {
      // Already spoken word — dimmed
      const spokenColor = hexToASSColor(config.spokenColor)
      parts.push(`{\\c${spokenColor}}${wordText}{\\r}`)
    } else {
      // Upcoming word — primary color (no override, use style default)
      parts.push(wordText)
    }
  }

  return parts.join(' ')
}

// ── Build Word Events ────────────────────────────────

export function buildWordEvents(params: {
  wordTimestamps: WordTimestamp[]
  subtitleConfig: SubtitleConfig
  fps: number
}): ASSEvent[] {
  const { wordTimestamps, subtitleConfig, fps } = params
  const events: ASSEvent[] = []
  const maxWordsPerLine = subtitleConfig.maxWordsPerLine

  if (wordTimestamps.length === 0) {
    return events
  }

  // Group words into phrases
  const phrases: WordTimestamp[][] = []
  let currentPhrase: WordTimestamp[] = []

  for (let i = 0; i < wordTimestamps.length; i++) {
    currentPhrase.push(wordTimestamps[i])

    if (
      currentPhrase.length === maxWordsPerLine ||
      i === wordTimestamps.length - 1
    ) {
      phrases.push([...currentPhrase])
      currentPhrase = []
    }
  }

  // For each phrase, create one ASS event per word
  for (const phrase of phrases) {
    for (let wordIdx = 0; wordIdx < phrase.length; wordIdx++) {
      const word = phrase[wordIdx]

      const start = secondsToTime(word.start)
      const end = secondsToTime(word.end)
      const text = buildPhraseText(phrase, wordIdx, subtitleConfig)

      events.push({ start, end, text })
    }
  }

  return events
}

// ── Build Complete ASS File ──────────────────────────

export function buildASSFile(params: {
  events: ASSEvent[]
  style: ASSStyle
  videoWidth: number
  videoHeight: number
}): string {
  const { events, style, videoWidth, videoHeight } = params

  // Script Info section
  const scriptInfo = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${videoWidth}`,
    `PlayResY: ${videoHeight}`,
    'ScaledBorderAndShadow: yes',
    'YCbCr Matrix: None',
    '',
  ].join('\n')

  // Style line
  const styleLine = [
    style.name,
    style.fontName,
    style.fontSize,
    style.primaryColor,
    style.secondaryColor,
    style.outlineColor,
    style.backColor,
    style.bold ? -1 : 0,
    style.italic ? -1 : 0,
    style.underline ? -1 : 0,
    0, // StrikeOut
    style.scaleX,
    style.scaleY,
    style.spacing,
    0, // Angle
    style.borderStyle,
    style.outline,
    style.shadow,
    style.alignment,
    style.marginL,
    style.marginR,
    style.marginV,
    1, // Encoding
  ].join(',')

  const stylesSection = [
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: ${styleLine}`,
    '',
  ].join('\n')

  // Events section
  const eventLines = events.map(
    (e) =>
      `Dialogue: 0,${e.start},${e.end},Default,,0,0,0,,${e.text}`
  )

  const eventsSection = [
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...eventLines,
    '',
  ].join('\n')

  return scriptInfo + '\n' + stylesSection + '\n' + eventsSection
}

// ── Write ASS File to Disk ───────────────────────────

export async function writeASSFile(
  content: string,
  outputPath: string
): Promise<void> {
  await writeFile(outputPath, content, 'utf-8')
}
