'use client'

import { useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { PLANS } from '@/lib/utils/constants'

interface UseCreditsReturn {
  credits: number
  creditsUsed: number
  plan: string
  planLimit: number
  percentUsed: number
  isLow: boolean
  isEmpty: boolean
  daysUntilReset: number
  isLoading: boolean
}

function getPlanLimit(plan: string): number {
  switch (plan) {
    case 'starter':
      return PLANS.starter.credits
    case 'pro':
      return PLANS.pro.credits
    case 'creator_max':
      return PLANS.creator_max.credits
    default:
      return 0
  }
}

export function useCredits(): UseCreditsReturn {
  const { user, isLoading } = useUser()

  return useMemo(() => {
    if (!user) {
      return {
        credits: 0,
        creditsUsed: 0,
        plan: 'starter',
        planLimit: 30,
        percentUsed: 0,
        isLow: false,
        isEmpty: true,
        daysUntilReset: 0,
        isLoading,
      }
    }

    const planLimit = getPlanLimit(user.plan)
    const percentUsed =
      planLimit > 0 ? (user.creditsUsed / planLimit) * 100 : 0

    const resetDate = new Date(user.creditsReset)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    const daysUntilReset = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

    return {
      credits: user.credits,
      creditsUsed: user.creditsUsed,
      plan: user.plan,
      planLimit,
      percentUsed: Math.min(100, percentUsed),
      isLow: user.credits <= 5,
      isEmpty: user.credits === 0,
      daysUntilReset,
      isLoading,
    }
  }, [user, isLoading])
}
