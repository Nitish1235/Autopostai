import axios from 'axios'
import { uploadBuffer, generateMasterAudioKey } from '@/lib/gcs/storage'

// ── Config ───────────────────────────────────────────
const BASE_URL = 'https://api.v8.unrealspeech.com'
const API_KEY = process.env.UNREAL_SPEECH_API_KEY!

// ── Voice Mapping ────────────────────────────────────
// Maps all frontend voice IDs → UnrealSpeech V8 canonical VoiceId strings.
// Legacy aliases (ryan, sarah...) gracefully map to their nearest V8 equivalent
// so existing DB records with old IDs continue to work.
const VOICE_MAP: Record<string, string> = {
  // ── Legacy aliases (kept for backward compat with existing video records) ──
  ryan:   'Noah',
  sarah:  'Autumn',
  jake:   'Noah',
  maya:   'Melody',
  alex:   'Caleb',
  luna:   'Luna',
  james:  'Noah',
  aria:   'Autumn',
  marcus: 'Noah',
  elena:  'Autumn',
  dan:    'Noah',
  will:   'Noah',
  liv:    'Autumn',
  scarlett:  'Autumn',
  // ── American Female ─────────────────────────────────
  'Autumn':  'Autumn',
  'Melody':  'Melody',
  'Hannah':  'Hannah',
  'Emily':   'Emily',
  'Ivy':     'Ivy',
  'Kaitlyn': 'Kaitlyn',
  'Luna':    'Luna',
  'Willow':  'Willow',
  'Lauren':  'Lauren',
  'Sierra':  'Sierra',
  // ── American Male ───────────────────────────────────
  'Noah':    'Noah',
  'Jasper':  'Jasper',
  'Caleb':   'Caleb',
  'Ronan':   'Ronan',
  'Ethan':   'Ethan',
  'Daniel':  'Daniel',
  'Zane':    'Zane',
  // ── French ──────────────────────────────────────────
  'Élodie':  'Élodie',
  // ── Spanish ─────────────────────────────────────────
  'Lucía':   'Lucía',
  'Mateo':   'Mateo',
  'Javier':  'Javier',
  // ── Portuguese ──────────────────────────────────────
  'Camila':  'Camila',
  'Thiago':  'Thiago',
  'Rafael':  'Rafael',
  // ── Italian ─────────────────────────────────────────
  'Giulia':  'Giulia',
  'Luca':    'Luca',
  // ── Hindi ───────────────────────────────────────────
  'Ananya':  'Ananya',
  'Priya':   'Priya',
  'Arjun':   'Arjun',
  'Rohan':   'Rohan',
  // ── Chinese ─────────────────────────────────────────
  'Mei':     'Mei',
  'Lian':    'Lian',
  'Ting':    'Ting',
  'Jing':    'Jing',
  'Wei':     'Wei',
  'Jian':    'Jian',
  'Hao':     'Hao',
  'Sheng':   'Sheng',
  // ── Japanese ────────────────────────────────────────
  'Yuki':    'Yuki',
  'Haruto':  'Haruto',
}

// ── Interfaces ───────────────────────────────────────

interface WordTimestampRaw {
  word: string
  start: number
  end: number
}

interface VoiceGenerationResult {
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

// ── Convert user voiceSpeed (1.0=normal) to UnrealSpeech Speed param ─────
// UnrealSpeech: Speed 0=normal, -1=slowest, 0.5=fastest
// User UI:      speed 1.0=normal, 0.75=slower, 1.5=faster
// Formula: unrealSpeed = (userSpeed - 1.0) * 1.0  (linear, capped to -1..0.5)
function toUnrealSpeed(userSpeed: number): number {
  const converted = userSpeed - 1.0  // 0.75 → -0.25, 1.0 → 0, 1.5 → 0.5
  return Math.max(-1, Math.min(0.5, converted))
}

// ── Generate Voice ───────────────────────────────────

export async function generateVoice(params: {
  text: string
  voiceId: string
  speed?: number
  pitch?: number
}): Promise<VoiceGenerationResult> {
  const cleanedText = cleanTextForTTS(params.text)

  // Map internal alias (ryan, sarah...) → UnrealSpeech canonical name (Dan, Scarlett...)
  const unrealVoiceId = VOICE_MAP[params.voiceId] ?? params.voiceId
  if (!VOICE_MAP[params.voiceId]) {
    console.warn(`[unrealSpeech] VoiceId '${params.voiceId}' not found in VOICE_MAP — using as-is. Valid keys: ${Object.keys(VOICE_MAP).join(', ')}`)
  }

  const requestBody = {
    Text: cleanedText,
    VoiceId: unrealVoiceId,
    Bitrate: '192k',
    Speed: toUnrealSpeed(params.speed ?? 1.0),
    Pitch: params.pitch ?? 1.0,
    // TimestampType supported on /speech but NOT on /stream
    TimestampType: 'word',
  }

  // FIX: Use /speech endpoint — returns OutputUri (MP3) + TimestampsUri (JSON)
  // The /stream endpoint does NOT support TimestampType per API docs.
  interface SpeechResponse {
    OutputUri: string
    TimestampsUri: string
    PhonemeTimestampsUri?: string
    CreationTime?: string
    RequestCharacters?: number
    VoiceId?: string
  }

  let speechData: SpeechResponse
  try {
    const speechResponse = await axios.post<SpeechResponse>(
      `${BASE_URL}/speech`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    )
    speechData = speechResponse.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Unreal Speech authentication failed. Check UNREAL_SPEECH_API_KEY.')
      }
      if (error.response?.status === 400) {
        throw new Error(
          `Unreal Speech bad request: ${JSON.stringify(error.response.data)}. ` +
          `Ensure VoiceId is a valid V8 voice (e.g. Autumn, Noah, Jasper, Scarlett, Melody...)`
        )
      }
      if (error.response?.status === 429) {
        throw new Error('Unreal Speech rate limit exceeded')
      }
      throw new Error(
        `Voice generation failed: ${error.response?.status ?? 'unknown'} — ${JSON.stringify(error.response?.data ?? {})} — ${error.message}`
      )
    }
    throw new Error(`Voice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  if (!speechData.OutputUri) {
    throw new Error(`Unreal Speech returned success but missing OutputUri. full response: ${JSON.stringify(speechData)}`)
  }

  // Download audio binary from the returned URL
  let audioBuffer: Buffer
  try {
    const audioDownload = await axios.get(speechData.OutputUri, {
      responseType: 'arraybuffer',
      timeout: 60000,
    })
    audioBuffer = Buffer.from(audioDownload.data)
  } catch (err: any) {
    throw new Error(`Failed to download audio from Unreal Speech OutputUri: ${err?.message || 'unknown error'}`)
  }

  // Download word timestamps from TimestampsUri
  let words: WordTimestampRaw[] = []
  if (speechData.TimestampsUri) {
    try {
      const tsResponse = await axios.get(speechData.TimestampsUri, { timeout: 15000 })
      const tsData = tsResponse.data

      // TimestampsUri returns [{word, start, end}, ...] or {words: [...]}
      if (Array.isArray(tsData)) {
        words = tsData.map((item: { word: string; start: number; end: number }) => ({
          word: item.word,
          start: item.start,
          end: item.end,
        }))
      } else if (tsData && Array.isArray(tsData.words)) {
        words = tsData.words.map((item: { word: string; start: number; end: number }) => ({
          word: item.word,
          start: item.start,
          end: item.end,
        }))
      }
    } catch {
      console.warn('[unrealSpeech] Failed to fetch word timestamps, continuing without them')
    }
  }

  // Calculate actual duration from last word timestamp + small padding
  let duration = 3.5
  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    duration = lastWord.end + 0.3
  } else {
    duration = estimateDuration(cleanedText, params.speed ?? 1.0)
  }

  return {
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

  const gcsKey = generateMasterAudioKey(
    params.userId,
    params.videoId
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
