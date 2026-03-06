import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { uploadBuffer } from '@/lib/gcs/storage'
import { v4 as uuidv4 } from 'uuid'

// ── POST — Upload file to GCS ────────────────────────

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const folder = (formData.get('folder') as string) ?? 'admin'

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            )
        }

        // Read file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Determine extension and content type
        const ext = file.name.split('.').pop() ?? 'bin'
        const contentType = file.type || 'application/octet-stream'
        const key = `admin/${folder}/${uuidv4()}.${ext}`

        // Upload to GCS
        const url = await uploadBuffer(buffer, key, contentType)

        return NextResponse.json({
            success: true,
            data: { url, key, contentType, size: buffer.length },
        })
    } catch (error) {
        console.error('[admin/upload] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Upload failed' },
            { status: 500 }
        )
    }
}
