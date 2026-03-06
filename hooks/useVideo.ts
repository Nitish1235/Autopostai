'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface VideoStatus {
  status: string | null
  progress: number
  stage: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  error: string | null
  isComplete: boolean
  isFailed: boolean
  isProcessing: boolean
}

const POLL_INTERVAL = 3000 // 3 seconds
const TERMINAL_STATUSES = new Set(['ready', 'failed', 'posted'])

export function useVideoStatus(videoId: string | null): VideoStatus {
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!videoId) return

    try {
      const response = await fetch(`/api/video/${videoId}/status`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      setStatus(data.status ?? null)
      setProgress(data.progress ?? 0)
      setStage(data.stage ?? null)
      setVideoUrl(data.videoUrl ?? null)
      setThumbnailUrl(data.thumbnailUrl ?? null)
      setError(data.error ?? null)

      // Stop polling on terminal status
      if (data.status && TERMINAL_STATUSES.has(data.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (fetchError) {
      console.error('[useVideoStatus] Fetch error:', fetchError)
      // Don't stop polling on transient errors
    }
  }, [videoId])

  useEffect(() => {
    if (!videoId) {
      // Reset state
      setStatus(null)
      setProgress(0)
      setStage(null)
      setVideoUrl(null)
      setThumbnailUrl(null)
      setError(null)
      return
    }

    // Fetch immediately
    fetchStatus()

    // Start polling
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [videoId, fetchStatus])

  return {
    status,
    progress,
    stage,
    videoUrl,
    thumbnailUrl,
    error,
    isComplete: status === 'ready',
    isFailed: status === 'failed',
    isProcessing: !!status && !TERMINAL_STATUSES.has(status),
  }
}
