import { NextRequest, NextResponse } from 'next/server'
import { handlePublishJob } from '@/lib/queue/workers/publishWorker'

// ── POST /api/jobs/publish ───────────────────────────
// QStash delivers publish jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/publish] Received job for video: ${data.videoId}`)
    const result = await handlePublishJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/publish] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
