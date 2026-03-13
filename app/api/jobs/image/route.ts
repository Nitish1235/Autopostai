import { NextRequest, NextResponse } from 'next/server'
import { handleImageJob } from '@/lib/queue/workers/imageWorker'

// ── POST /api/jobs/image ─────────────────────────────
// QStash delivers image generation jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/image] Received job for video: ${data.videoId}, segment: ${data.segmentIndex}`)
    const result = await handleImageJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/image] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
