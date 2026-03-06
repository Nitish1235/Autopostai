import axios from 'axios'
import { uploadBuffer, generateSegmentKey } from '@/lib/gcs/storage'

// ── Config ───────────────────────────────────────────
const BASE_URL = 'https://api.v8.unrealspeech.com'
const API_KEY = process.env.UNREAL_SPEECH_API_KEY!

// ── Voice Mapping ────────────────────────────────────
const VOICE_MAP: Record<string, string> = {
  ryan: 'Dan',
  sarah: 'Scarlett',
  james: 'Will',
  aria: 'Liv',
  marcus: 'Dan',
  elena: 'Scarlett',
}

// ── Interfaces ───────────────────────────────────────

interface WordTimestampRaw {
  word: string
  start: number
  end: number
}

interface VoiceGenerationResult {
  audioUrl: string
  audioBuffer: Buffer
  words: WordTimestampRaw[]
  duration: number
}

// ── Clean Text for TTS ───────────────────────────────

export function cleanTextForTTS(text: string): string {
  let cleaned = text
  // Replace em-dash with comma-space
  cleaned = cleaned.replace(/—/g, ', ')
  // Replace ellipsis with period-space
  cleaned = cleaned.replace(/\.\.\./g, '. ')
  cleaned = cleaned.replace(/…/g, '. ')
  // Remove asterisks
  cleaned = cleaned.replace(/\*/g, '')
  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  // Trim whitespace
  cleaned = cleaned.trim()
  // Ensure text ends with punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.'
  }
  return cleaned
}

// ── Generate Voice ───────────────────────────────────

export async function generateVoice(params: {
  text: string
  voiceId: string
  speed?: number
  pitch?: number
}): Promise<VoiceGenerationResult> {
  const mappedVoice = params.voiceId // v8 uses the exact names
  const cleanedText = cleanTextForTTS(params.text)

  const requestBody = {
    Text: cleanedText,
    VoiceId: mappedVoice,
    Bitrate: '192k',
    Speed: params.speed ?? 0,
    Pitch: params.pitch ?? 1.0,
    TimestampType: 'word',
  }

  // Generate audio stream
  let audioBuffer: Buffer
  try {
    const audioResponse = await axios.post(
      `${BASE_URL}/stream`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    )
    audioBuffer = Buffer.from(audioResponse.data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Unreal Speech authentication failed')
      }
      if (error.response?.status === 429) {
        throw new Error('Unreal Speech rate limit exceeded')
      }
      throw new Error(
        `Voice generation failed: ${error.response?.status ?? 'unknown'}`
      )
    }
    throw error
  }

  // Get word-level timestamps
  let words: WordTimestampRaw[] = []
  try {
    const timestampResponse = await axios.post(
      `${BASE_URL}/timestamps`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    const timestampData = timestampResponse.data
    if (Array.isArray(timestampData)) {
      words = timestampData.map(
        (item: { word: string; start: number; end: number }) => ({
          word: item.word,
          start: item.start,
          end: item.end,
        })
      )
    } else if (
      timestampData &&
      typeof timestampData === 'object' &&
      Array.isArray(timestampData.words)
    ) {
      words = timestampData.words.map(
        (item: { word: string; start: number; end: number }) => ({
          word: item.word,
          start: item.start,
          end: item.end,
        })
      )
    }
  } catch {
    // Timestamps are non-critical; continue without them
    console.warn('Failed to fetch word timestamps, continuing without them')
  }

  // Calculate duration from last word end time + padding
  let duration = 3.5 // Default fallback
  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    duration = lastWord.end + 0.3
  } else {
    // Estimate from text
    duration = estimateDuration(cleanedText, params.speed ?? 1.0)
  }

  return {
    audioUrl: '', // Caller uploads to GCS and sets this
    audioBuffer,
    words,
    duration,
  }
}

// ── Generate Voice and Upload ────────────────────────

export async function generateVoiceAndUpload(params: {
  text: string
  voiceId: string
  speed?: number
  userId: string
  videoId: string
  segmentIndex: number
}): Promise<{
  gcsUrl: string
  words: WordTimestampRaw[]
  duration: number
}> {
  const result = await generateVoice({
    text: params.text,
    voiceId: params.voiceId,
    speed: params.speed,
  })

  const gcsKey = generateSegmentKey(
    params.userId,
    params.videoId,
    'audio',
    params.segmentIndex,
    'mp3'
  )

  const gcsUrl = await uploadBuffer(result.audioBuffer, gcsKey, 'audio/mpeg')

  return {
    gcsUrl,
    words: result.words,
    duration: result.duration,
  }
}

// ── Estimate Duration ────────────────────────────────

export function estimateDuration(
  text: string,
  speed: number = 1.0
): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const baseDuration = (wordCount / 150) * 60
  return baseDuration / speed
}

// ── Generate Preview Audio ───────────────────────────

export async function generatePreviewAudio(params: {
  voiceId: string
  text?: string
}): Promise<Buffer> {
  const previewText =
    params.text ??
    'In 1971, a decision that changed the world forever was made by a 26-year-old with nothing in his pocket.'

  const result = await generateVoice({
    text: previewText,
    voiceId: params.voiceId,
  })

  return result.audioBuffer
}
