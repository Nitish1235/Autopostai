import { NextResponse } from 'next/server'
import { VOICES } from '@/lib/utils/constants'
import { fileExists, uploadBuffer, getSignedUrl } from '@/lib/gcs/storage'
import { generatePreviewAudio } from '@/lib/api/unrealSpeech'

// ── GET /api/voice/previews ──────────────────────────
// Returns pre-generated voice preview audio URLs.
// Cached in GCS. First call may be slow as it generates
// missing previews on-demand.

export async function GET(req: Request) {
  try {
    const previews: Array<{
      voiceId: string
      name: string
      previewUrl: string
    }> = []

    for (const voice of VOICES) {
      const gcsKey = `previews/${voice.id}.mp3`

      // Check if preview already exists in GCS
      const exists = await fileExists(gcsKey)

      if (exists) {
        // Return signed URL for existing preview
        const previewUrl = await getSignedUrl(gcsKey, 60)
        previews.push({
          voiceId: voice.id,
          name: voice.name,
          previewUrl,
        })
      } else {
        // Generate preview audio and upload
        try {
          const audioBuffer = await generatePreviewAudio({
            voiceId: voice.id,
          })

          await uploadBuffer(audioBuffer, gcsKey, 'audio/mpeg')
          const previewUrl = await getSignedUrl(gcsKey, 60)

          previews.push({
            voiceId: voice.id,
            name: voice.name,
            previewUrl,
          })
        } catch (genError) {
          console.error(
            `[api/voice/previews] Failed to generate preview for ${voice.id}:`,
            genError
          )
          // Skip this voice if generation fails
          previews.push({
            voiceId: voice.id,
            name: voice.name,
            previewUrl: '',
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: previews,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/voice/previews] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
