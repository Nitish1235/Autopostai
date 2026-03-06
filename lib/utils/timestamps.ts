import type { WordTimestamp } from '@/types'

// ── Raw Types ─────────────────────────────────────────

interface RawWord {
  word: string
  start: number
  end: number
}

interface SegmentWithWords {
  words: RawWord[]
  audioDuration: number
}

// ── Convert to Frame Timestamps ──────────────────────

export function convertToFrameTimestamps(
  words: RawWord[],
  fps: number = 30
): WordTimestamp[] {
  return words.map((word) => ({
    word: word.word,
    start: word.start,
    end: word.end,
    startFrame: Math.floor(word.start * fps),
    endFrame: Math.ceil(word.end * fps),
  }))
}

// ── Offset Segment Timestamps ────────────────────────

export function offsetSegmentTimestamps(
  segments: SegmentWithWords[],
  fps: number = 30
): WordTimestamp[] {
  const result: WordTimestamp[] = []
  let cumulativeDuration = 0

  for (const segment of segments) {
    for (const word of segment.words) {
      const offsetStart = word.start + cumulativeDuration
      const offsetEnd = word.end + cumulativeDuration

      result.push({
        word: word.word,
        start: offsetStart,
        end: offsetEnd,
        startFrame: Math.floor(offsetStart * fps),
        endFrame: Math.ceil(offsetEnd * fps),
      })
    }

    cumulativeDuration += segment.audioDuration
  }

  return result
}

// ── Get Active Word ──────────────────────────────────

export function getActiveWord(
  wordTimestamps: WordTimestamp[],
  currentFrame: number
): WordTimestamp | null {
  for (const word of wordTimestamps) {
    if (currentFrame >= word.startFrame && currentFrame <= word.endFrame) {
      return word
    }
  }
  return null
}

// ── Get Word State ───────────────────────────────────

export function getWordState(
  word: WordTimestamp,
  currentFrame: number
): 'upcoming' | 'active' | 'spoken' {
  if (currentFrame < word.startFrame) return 'upcoming'
  if (currentFrame >= word.startFrame && currentFrame <= word.endFrame)
    return 'active'
  return 'spoken'
}

// ── Get Segment Frame Range ──────────────────────────

export function getSegmentFrameRange(
  segmentWords: WordTimestamp[]
): { startFrame: number; endFrame: number } {
  if (segmentWords.length === 0) {
    return { startFrame: 0, endFrame: 0 }
  }

  const firstWord = segmentWords[0]
  const lastWord = segmentWords[segmentWords.length - 1]

  return {
    startFrame: firstWord.startFrame,
    endFrame: lastWord.endFrame,
  }
}

// ── Calculate Video Duration ─────────────────────────

export function calculateVideoDuration(
  segments: SegmentWithWords[]
): number {
  let total = 0
  for (const segment of segments) {
    total += segment.audioDuration
  }
  return total
}

// ── Format Duration ──────────────────────────────────

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
