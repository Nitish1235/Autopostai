import { NextRequest, NextResponse } from 'next/server'
import { handleVoiceJob } from '@/lib/queue/workers/voiceWorker'

// ── POST /api/jobs/voice ─────────────────────────────
// QStash delivers voice generation jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/voice] Received job for video: ${data.videoId}, segment: ${data.segmentIndex}`)
    const result = await handleVoiceJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/voice] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
