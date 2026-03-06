'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="accent" size="md" className="mb-6">
            <Sparkles size={12} className="mr-1.5" />
            AI-Powered Video Creation
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[48px] md:text-[64px] lg:text-[72px] font-bold text-[var(--text-primary)] leading-[1.05] tracking-[-0.02em] max-w-[800px] mx-auto"
        >
          Create viral shorts
          <br />
          <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] bg-clip-text text-transparent">
            on autopilot
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[17px] md:text-[19px] text-[var(--text-secondary)] mt-5 max-w-[560px] mx-auto leading-relaxed"
        >
          Generate scripts, voiceovers, images, and subtitles — then post to
          TikTok, Instagram, YouTube &amp; X. All from one dashboard.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
        >
          <Link href="/login">
            <Button size="lg" rightIcon={<ArrowRight size={16} />}>
              Start Creating — Free
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="secondary" size="lg" leftIcon={<Play size={16} />}>
              See How It Works
            </Button>
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-6 text-[var(--text-dim)]"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium">🎬</span>
            <span className="text-[13px]">10K+ videos created</span>
          </div>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium">⭐</span>
            <span className="text-[13px]">4.9/5 rating</span>
          </div>
          <div className="w-px h-4 bg-[var(--border)] hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[13px] font-medium">🚀</span>
            <span className="text-[13px]">2K+ creators</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { Hero }
