import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePreviewAudio } from '@/lib/api/unrealSpeech'
import { uploadBuffer } from '@/lib/gcs/storage'
import { VOICES } from '@/lib/utils/constants'

// Default ~8s dialogue used for all voice previews
const PREVIEW_DIALOGUE =
  "Hey there! I'm your AI narrator. I'll be telling your stories, sharing your insights, and bringing your content to life. Let's create something amazing together."

// Concurrency limiter — run N voices in parallel to avoid rate limits
async function withConcurrency<T>(
  items: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const fn of items) {
    const p = fn().then((r) => {
      results.push(r)
    })
    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
      // Remove settled promises
      executing.splice(
        executing.findIndex((e) => {
          let settled = false
          e.then(() => (settled = true)).catch(() => (settled = true))
          return settled
        }),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

// POST /api/admin/voices/generate
export async function POST() {
  try {
    const isAdmin = await isAdminAuthenticated()
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results: Array<{
      voiceId: string
      name: string
      status: 'ok' | 'error'
      error?: string
    }> = []

    // Generate previews with concurrency of 3 to avoid TTS rate limits
    const tasks = VOICES.map((voice) => async () => {
      try {
        console.log(`[voice-generate] Generating preview for ${voice.id}`)

        // Call UnrealSpeech TTS with the default dialogue
        const audioBuffer = await generatePreviewAudio({
          voiceId: voice.id,
          text: PREVIEW_DIALOGUE,
        })

        // Upload to GCS
        const gcsKey = `voice-previews/${voice.id}.mp3`
        const audioUrl = await uploadBuffer(audioBuffer, gcsKey, 'audio/mpeg')

        // Upsert in DB
        await prisma.adminVoicePreview.upsert({
          where: { voiceId: voice.id },
          create: { voiceId: voice.id, audioUrl, active: true },
          update: { audioUrl, active: true, updatedAt: new Date() },
        })

        results.push({ voiceId: voice.id, name: voice.name, status: 'ok' })
        console.log(`[voice-generate] ✓ ${voice.id} done`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[voice-generate] ✗ ${voice.id} failed: ${msg}`)
        results.push({ voiceId: voice.id, name: voice.name, status: 'error', error: msg })
      }
    })

    // Run with concurrency of 3
    await withConcurrency(tasks, 3)

    const generated = results.filter((r) => r.status === 'ok').length
    const failed = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      success: true,
      data: {
        total: VOICES.length,
        generated,
        failed,
        results,
      },
    })
  } catch (error) {
    console.error('[voice-generate] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
