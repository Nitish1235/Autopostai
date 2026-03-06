'use client'

import { useState, useEffect, useCallback } from 'react'

interface UserData {
  id: string
  email: string
  name: string
  image: string | null
  plan: string
  credits: number
  creditsUsed: number
  creditsReset: string
  aiVideoCredits: number
  aiVideoCreditsUsed: number
  defaultNiche: string | null
  defaultVoiceId: string | null
  defaultStyle: string | null
  defaultFormat: string
  channelName: string | null
  notifyVideoReady: boolean
  notifyVideoPosted: boolean
  notifyMilestone: boolean
  notifyWeeklyReport: boolean
  notifyTrendAlert: boolean
  notifyCreditLow: boolean
  dodoCustomerId: string | null
  dodoSubscriptionId: string | null
  platformConnections: PlatformConnectionData[]
  autopilotConfig: AutopilotConfigData | null
  createdAt: string
  updatedAt: string
}

interface PlatformConnectionData {
  id: string
  platform: string
  handle: string | null
  displayName: string | null
  connected: boolean
  autoPost: boolean
  dailyLimit: number
  followerCount: number
  monthlyViews: number
  monthlyPosts: number
  shadowbanRisk: string
  lastPostStatus: string | null
  tokenExpiry: string | null
}

interface AutopilotConfigData {
  id: string
  enabled: boolean
  niche: string
  format: string
  postsPerDay: number
  imageStyle: string
  voiceId: string
  musicMood: string
  approvalMode: string
  schedule: string
  aiOptimizeTime: boolean
  lastRunAt: string | null
  nextRunAt: string | null
}

interface UseUserReturn {
  user: UserData | null
  isLoading: boolean
  error: string | null
  mutate: () => void
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/user')

      if (response.status === 401) {
        setUser(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        setUser(data.data)
      } else {
        setUser(null)
        if (data.error) {
          setError(data.error)
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch user'
      setError(message)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return {
    user,
    isLoading,
    error,
    mutate: fetchUser,
  }
}
