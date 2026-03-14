import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'
import { unlink } from 'fs/promises'

// ── GCS Client Setup ──────────────────────────────────
// On Cloud Run (detected via K_SERVICE), ALWAYS use Application Default Credentials.
// Locally, use explicit GCS_CLIENT_EMAIL + GCS_PRIVATE_KEY env vars if provided.
const isCloudRun = !!process.env.K_SERVICE
const storage = (!isCloudRun && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY)
  ? new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    })
  : new Storage({ projectId: process.env.GCS_PROJECT_ID })

const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? 'autopost-ai-media'
const bucket = storage.bucket(BUCKET_NAME)

// Public URL: use env var if set, otherwise construct from bucket name
const GCS_PUBLIC_URL = process.env.GCS_PUBLIC_URL ?? `https://storage.googleapis.com/${BUCKET_NAME}`

// ── Upload buffer to GCS ──────────────────────────────
export async function uploadBuffer(
  buffer: Buffer,
  destination: string,
  contentType: string
): Promise<string> {
  try {
    const file = bucket.file(destination)
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    })
    return `${GCS_PUBLIC_URL}/${destination}`
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown upload error'
    throw new Error(`GCS upload failed for ${destination}: ${message}`)
  }
}

// ── Upload from local file path ───────────────────────
export async function uploadFromPath(
  localPath: string,
  destination: string,
  contentType: string
): Promise<string> {
  try {
    await bucket.upload(localPath, {
      destination,
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    })

    // Delete local file after successful upload
    try {
      await unlink(localPath)
    } catch {
      // Non-critical: local file cleanup failure
    }

    return `${GCS_PUBLIC_URL}/${destination}`
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown upload error'
    throw new Error(
      `GCS upload from path failed for ${destination}: ${message}`
    )
  }
}

// ── Get signed URL ────────────────────────────────────
export async function getSignedUrl(
  destination: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const [url] = await bucket.file(destination).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  })
  return url
}

// ── Delete file ───────────────────────────────────────
export async function deleteFile(destination: string): Promise<void> {
  try {
    await bucket.file(destination).delete()
  } catch {
    // Silently ignore if file not found
  }
}

// ── Check if file exists ──────────────────────────────
export async function fileExists(destination: string): Promise<boolean> {
  try {
    const [exists] = await bucket.file(destination).exists()
    return exists
  } catch {
    return false
  }
}

// ── Key Generators ────────────────────────────────────

export function generateKey(
  userId: string,
  type: 'video' | 'image' | 'audio' | 'thumbnail',
  ext: string
): string {
  return `users/${userId}/${type}s/${uuidv4()}.${ext}`
}

export function generateSegmentKey(
  userId: string,
  videoId: string,
  type: 'image' | 'audio',
  index: number,
  ext: string
): string {
  return `users/${userId}/videos/${videoId}/segments/${type}_${index}.${ext}`
}

export function generateMasterAudioKey(
  userId: string,
  videoId: string
): string {
  return `users/${userId}/videos/${videoId}/audio/master.mp3`
}

export function generateVideoKey(
  userId: string,
  videoId: string
): string {
  return `users/${userId}/videos/${videoId}/output.mp4`
}

export function generateThumbnailKey(
  userId: string,
  videoId: string
): string {
  return `users/${userId}/videos/${videoId}/thumbnail.jpg`
}
