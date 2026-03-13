import { NextRequest, NextResponse } from 'next/server'
import { handleScriptJob } from '@/lib/queue/workers/scriptWorker'

// ── POST /api/jobs/script ────────────────────────────
// QStash delivers script generation jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/script] Received job for video: ${data.videoId}`)
    const result = await handleScriptJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/script] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
