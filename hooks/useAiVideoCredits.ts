'use client'

import { useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { AI_VIDEO_LIMITS } from '@/lib/utils/constants'

interface UseAiVideoCreditsReturn {
    credits: number
    creditsUsed: number
    plan: string
    limit: number
    percentUsed: number
    isLow: boolean
    isEmpty: boolean
    isLoading: boolean
}

export function useAiVideoCredits(): UseAiVideoCreditsReturn {
    const { user, isLoading } = useUser()

    return useMemo(() => {
        if (!user) {
            return {
                credits: 0,
                creditsUsed: 0,
                plan: 'free',
                limit: 0,
                percentUsed: 0,
                isLow: false,
                isEmpty: true,
                isLoading,
            }
        }

        const limit = AI_VIDEO_LIMITS[user.plan] ?? 0
        const percentUsed = limit > 0 ? (user.aiVideoCreditsUsed / limit) * 100 : 0

        return {
            credits: user.aiVideoCredits,
            creditsUsed: user.aiVideoCreditsUsed,
            plan: user.plan,
            limit,
            percentUsed: Math.min(100, percentUsed),
            isLow: user.aiVideoCredits <= 3,
            isEmpty: user.aiVideoCredits === 0,
            isLoading,
        }
    }, [user, isLoading])
}
