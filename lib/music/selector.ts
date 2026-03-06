import path from 'path'
import fs from 'fs'

// ── Music Library Map ────────────────────────────────

const MUSIC_LIBRARY: Record<string, string[]> = {
  upbeat: [
    'music/upbeat/energetic-01.mp3',
    'music/upbeat/upbeat-02.mp3',
  ],
  dark: [
    'music/dark/tense-01.mp3',
    'music/dark/dark-02.mp3',
  ],
  motivational: [
    'music/motivational/inspire-01.mp3',
    'music/motivational/motivate-02.mp3',
  ],
  calm: [
    'music/calm/ambient-01.mp3',
    'music/calm/peaceful-02.mp3',
  ],
  mystery: [
    'music/mystery/suspense-01.mp3',
    'music/mystery/mystery-02.mp3',
  ],
}

// ── Niche to Mood Map ────────────────────────────────

export const NICHE_MUSIC_MAP: Record<string, string> = {
  finance: 'motivational',
  health: 'upbeat',
  tech: 'upbeat',
  mindset: 'motivational',
  history: 'dark',
  science: 'calm',
  travel: 'upbeat',
  food: 'upbeat',
  business: 'motivational',
  mystery: 'mystery',
  nature: 'calm',
  relationships: 'calm',
}

// ── Get Music Path ───────────────────────────────────

export function getMusicPath(mood: string, videoId: string): string {
  const tracks = MUSIC_LIBRARY[mood] ?? MUSIC_LIBRARY.motivational
  const index = videoId.charCodeAt(0) % tracks.length
  const relativePath = tracks[index]
  const absolutePath = path.resolve(process.cwd(), relativePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Music file not found: ${absolutePath}`)
  }

  return absolutePath
}

// ── Get Music for Niche ──────────────────────────────

export function getMusicForNiche(niche: string, videoId: string): string {
  const mood = NICHE_MUSIC_MAP[niche] ?? 'motivational'
  return getMusicPath(mood, videoId)
}

// ── Get Music Path by Index ──────────────────────────

export function getMusicPathById(
  mood: string,
  trackIndex: number
): string {
  const tracks = MUSIC_LIBRARY[mood] ?? MUSIC_LIBRARY.motivational
  const safeIndex = Math.abs(trackIndex) % tracks.length
  const relativePath = tracks[safeIndex]
  return path.resolve(process.cwd(), relativePath)
}

// ── List Available Tracks ────────────────────────────

export function listAvailableTracks(): Array<{
  mood: string
  tracks: string[]
  count: number
}> {
  return Object.entries(MUSIC_LIBRARY).map(([mood, tracks]) => ({
    mood,
    tracks: tracks.map((t) => path.basename(t)),
    count: tracks.length,
  }))
}

// ── Get Music Metadata ───────────────────────────────

export function getMusicMetadata(trackPath: string): {
  filename: string
  mood: string
  path: string
} {
  const filename = path.basename(trackPath)
  const parentDir = path.basename(path.dirname(trackPath))

  // Determine mood from parent directory name
  let mood = 'unknown'
  for (const [moodKey, tracks] of Object.entries(MUSIC_LIBRARY)) {
    if (tracks.some((t) => t.includes(parentDir))) {
      mood = moodKey
      break
    }
  }

  return {
    filename,
    mood,
    path: trackPath,
  }
}
