'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, Film, Mic, Image, Type, Clock, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface PricingPlan {
  id: string
  name: string
  price: number
  originalPrice: number
  credits: number
  soraCredits: number
  postsPerDay: number
  highlight?: boolean
  badge?: string
  description: string
  features: string[]
}

const PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    originalPrice: 49,
    credits: 30,
    soraCredits: 20,
    postsPerDay: 1,
    description: 'Perfect for getting started with faceless video content.',
    features: [
      '30 AI-generated faceless videos/month',
      'Auto-post 1 video/day across all connected platforms',
      'AI script generation from any topic',
      'Choose from 30s, 60s, or 90s video lengths',
      '48 AI voices (8 languages)',
      '8 AI visual styles (Cinematic, Anime, Cyberpunk, etc.)',
      '6–18 AI-generated images per video',
      'AI voiceover synthesis per scene',
      'Smart animated subtitles',
      'Background music library (5 mood categories)',
      'Publish to TikTok, Instagram, YouTube & X',
      'Basic analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    originalPrice: 129,
    credits: 100,
    soraCredits: 50,
    postsPerDay: 2,
    highlight: true,
    badge: 'Most Popular',
    description: 'For creators serious about growing their channels.',
    features: [
      '100 AI-generated faceless videos/month',
      'Auto-post 2 videos/day across all connected platforms',
      'Everything in Starter, plus:',
      'Advanced subtitle styles & animations',
      'Video scheduling & autopilot mode',
      'Full analytics dashboard with insights',
      'Priority video rendering',
      'Custom voice speed & pitch controls',
      'Email support',
    ],
  },
  {
    id: 'creator_max',
    name: 'Creator Max',
    price: 129,
    originalPrice: 339,
    credits: 300,
    soraCredits: 150,
    postsPerDay: 4,
    badge: 'Best Value',
    description: 'Maximum output for full-time content creators.',
    features: [
      '300 AI-generated faceless videos/month',
      'Auto-post 4 videos/day across all connected platforms',
      'Everything in Pro, plus:',
      'Full autopilot — set topics & let AI handle everything',
      'AI optimal posting time per platform',
      'Weekly performance reports via email',
      'Multi-channel management',
      'Dedicated priority support',
    ],
  },
]

// ── Shared features shown above plan cards ──────────

const INCLUDED_FEATURES = [
  { icon: Clock, label: '30s · 60s · 90s videos' },
  { icon: Image, label: '8 AI visual styles' },
  { icon: Mic, label: '48 voices, 8 languages' },
  { icon: Type, label: 'Animated subtitles' },
  { icon: Film, label: '6–18 AI images/video' },
  { icon: Share2, label: 'TikTok · Insta · YT · X' },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[var(--accent)] mb-3">
            Pricing
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-[16px] text-[var(--text-secondary)] mt-3 max-w-[600px] mx-auto leading-relaxed">
            Create faceless short-form videos powered by AI — we generate scripts, voiceovers,
            AI images, and animated subtitles, then compile and auto-publish for you. No camera, no editing.
          </p>

          {/* Free trial nudge */}
          <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
            <Zap size={14} className="text-[var(--accent)]" />
            <span className="text-[13px] text-[var(--text-secondary)]">
              Try it free — <strong className="text-[var(--text-primary)]">generate 1 video</strong> before you subscribe, no card required
            </span>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span
              className={cn(
                'text-[13px] font-medium transition-colors',
                !annual
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-dim)]'
              )}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                annual ? 'bg-[var(--accent)]' : 'bg-[var(--surface-hover)]'
              )}
            >
              <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-white"
                animate={{ left: annual ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span
              className={cn(
                'text-[13px] font-medium transition-colors',
                annual
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-dim)]'
              )}
            >
              Annual
            </span>
            {annual && (
              <Badge variant="success" size="sm">
                Save 20%
              </Badge>
            )}
          </div>
        </motion.div>

        {/* ── All plans include ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-8 p-4 rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--text-dim)] text-center mb-3">
            Every plan includes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {INCLUDED_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--surface-hover)]"
                >
                  <Icon size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] leading-tight">
                    {f.label}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, i) => {
            const displayPrice = annual
              ? Math.round(plan.price * 0.8)
              : plan.price

            const displayOriginalPrice = annual
              ? Math.round(plan.originalPrice * 0.8)
              : plan.originalPrice

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={cn(
                  'relative p-6 rounded-[16px] border transition-all',
                  plan.highlight
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_40px_-10px] shadow-[var(--accent)]/20'
                    : 'border-[var(--border)] bg-[var(--bg-card)]'
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      variant={plan.highlight ? 'accent' : 'dim'}
                      size="sm"
                    >
                      <Sparkles size={10} className="mr-1" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-2">
                  {plan.name}
                </h3>

                <p className="text-[12px] text-[var(--text-dim)] mt-1">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-2 mt-4 mb-1">
                  <span className="text-[20px] font-medium text-[var(--text-dim)] line-through decoration-[var(--text-dim)]/50 decoration-2">
                    ${displayOriginalPrice}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[40px] font-bold text-[var(--text-primary)] tabular-nums">
                      ${displayPrice}
                    </span>
                    <span className="text-[14px] text-[var(--text-dim)]">
                      /mo
                    </span>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 px-2 py-0.5 rounded">
                    <Sparkles size={10} className="text-[var(--accent)]" />
                    {plan.soraCredits} Sora 2 Gens
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded">
                    <Film size={10} />
                    {plan.credits} videos
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded">
                    📤 {plan.postsPerDay} post{plan.postsPerDay > 1 ? 's' : ''}/day
                  </span>
                </div>

                <Link href="/login">
                  <Button
                    variant={plan.highlight ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2">
                      <Check
                        size={14}
                        className={cn(
                          'mt-0.5 shrink-0',
                          plan.highlight
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--success)]'
                        )}
                      />
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* How it works footnote */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-10 max-w-[700px] mx-auto"
        >
          <p className="text-[12px] text-[var(--text-dim)] leading-relaxed">
            <strong className="text-[var(--text-secondary)]">How each video is made:</strong> You provide a topic (or let AI pick one).
            Our AI writes a narration script → generates a unique voiceover → creates 6–18 AI-powered images matching each scene →
            overlays animated subtitles → adds background music → and compiles everything into a polished, ready-to-post faceless video.
            Choose from 30-second, 60-second, or 90-second formats. No filming, no editing — just publish and grow.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export { Pricing }
