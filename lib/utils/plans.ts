// ── Plan Limits — Single Source of Truth ────────────────────────────────────
// Pricing defined in components/landing/Pricing.tsx
// Plans are stored as the `Plan` enum in schema.prisma:
//   free | starter | pro | creator_max

export type PlanId = 'free' | 'starter' | 'pro' | 'creator_max'

export interface PlanLimits {
  /** Videos that can be generated per month (credits) */
  creditsPerMonth: number
  /** Videos auto-posted per platform per day */
  dailyPostLimit: number
  /** Monthly price in USD */
  priceUsd: number
}

/** Plan limits keyed by plan ID — authoritative for all backend + UI enforcement */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    creditsPerMonth: 1,   // 1 trial video, no autopost
    dailyPostLimit: 0,    // no autoposting on free
    priceUsd: 0,
  },
  starter: {
    creditsPerMonth: 30,
    dailyPostLimit: 1,    // 1 video/day across all connected platforms
    priceUsd: 19,
  },
  pro: {
    creditsPerMonth: 100,
    dailyPostLimit: 2,    // 2 videos/day
    priceUsd: 49,
  },
  creator_max: {
    creditsPerMonth: 300,
    dailyPostLimit: 4,    // 4 videos/day
    priceUsd: 129,
  },
}

/** Returns the daily post limit for a given plan */
export function getDailyPostLimit(plan: string): number {
  return PLAN_LIMITS[plan as PlanId]?.dailyPostLimit ?? 0
}

/** Returns true if the plan allows autoposting */
export function canAutoPost(plan: string): boolean {
  return getDailyPostLimit(plan) > 0
}

/** Clamps a requested dailyLimit to the plan's max */
export function clampDailyLimit(requested: number, plan: string): number {
  const max = getDailyPostLimit(plan)
  return Math.min(Math.max(1, requested), Math.max(1, max))
}
