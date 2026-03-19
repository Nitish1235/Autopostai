'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCredits } from '@/hooks/useCredits'
import { useAiVideoCredits } from '@/hooks/useAiVideoCredits'
import { cn } from '@/lib/utils/cn'

function CreditBadge() {
  const { credits, planLimit, plan, percentUsed, isLow, isEmpty, daysUntilReset, isLoading } = useCredits()
  const {
    credits: aiCredits,
    limit: aiLimit,
    isEmpty: aiEmpty,
  } = useAiVideoCredits()

  const remaining = credits
  const fillPercent = planLimit > 0 ? (remaining / planLimit) * 100 : 0
  const fillColor = isEmpty
    ? 'bg-[var(--danger)]'
    : isLow
      ? 'bg-[var(--warning)]'
      : 'bg-[var(--accent)]'

  const aiFillPercent = aiLimit > 0 ? (aiCredits / aiLimit) * 100 : 0

  const planLabel = plan === 'creator_max' ? 'Max' : plan === 'pro' ? 'Pro' : plan === 'free' ? 'Free' : 'Starter'

  if (isLoading) {
    return (
      <div className="rounded-[9px] bg-[var(--accent-subtle)] border border-[var(--accent-border)] p-3 animate-pulse">
        <div className="h-4 bg-[var(--border)] rounded w-16 mb-2" />
        <div className="h-5 bg-[var(--border)] rounded w-24 mb-2" />
        <div className="h-1 bg-[var(--border)] rounded-full" />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-[9px] bg-[var(--danger)]/10 border border-[var(--danger)]/25 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-[var(--danger)] uppercase tracking-wider">
            {planLabel}
          </span>
          <Link
            href="/settings?tab=credits"
            className="text-[11px] text-[var(--danger)] hover:underline"
          >
            Upgrade →
          </Link>
        </div>
        <p className="text-[13px] font-bold text-[var(--danger)]">
          No credits remaining
        </p>
        <div className="h-[3px] rounded-full bg-[var(--border)] mt-2">
          <div className="h-full rounded-full bg-[var(--danger)]" style={{ width: '100%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[9px] bg-[var(--accent-subtle)] border border-[var(--accent-border)] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/15">
          {planLabel}
        </span>
        <Link
          href="/settings?tab=credits"
          className="text-[11px] text-[var(--accent)] hover:underline"
        >
          Top up →
        </Link>
      </div>

      {/* Regular video credits */}
      <div className="flex items-baseline gap-1">
        <span className="text-[20px] font-bold text-[var(--text-primary)] leading-none">
          {remaining}
        </span>
        <span className="text-[11px] text-[var(--text-secondary)]">
          / {planLimit} videos
        </span>
      </div>

      <div className="h-[3px] rounded-full bg-[var(--border)] mt-2.5 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', fillColor)}
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* AI Video credits — temporarily hidden while Sora 2 API is unavailable */}

      <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
        Resets in {daysUntilReset} days
      </p>
    </div>
  )
}

export { CreditBadge }
