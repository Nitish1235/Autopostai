import { NextRequest, NextResponse } from 'next/server'
import { handleAiVideoJob } from '@/lib/queue/workers/aiVideoWorker'

// ── POST /api/jobs/ai-video ──────────────────────────
// QStash delivers AI video generation jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/ai-video] Received job for video: ${data.videoId}`)
    const result = await handleAiVideoJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/ai-video] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
