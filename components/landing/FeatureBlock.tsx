'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  Mic2,
  Palette,
  Subtitles,
  Calendar,
  BarChart3,
  Zap,
  Globe,
} from 'lucide-react'

const FEATURES = [
  {
    icon: <Brain size={22} />,
    title: 'AI Script Writer',
    description:
      'GPT-4o generates research-backed scripts optimized for engagement and watch time.',
  },
  {
    icon: <Mic2 size={22} />,
    title: 'Natural Voiceovers',
    description:
      'Ultra-realistic AI voices with adjustable speed, pitch, and 10+ voice options.',
  },
  {
    icon: <Palette size={22} />,
    title: '8+ Visual Styles',
    description:
      'Cinematic, anime, cyberpunk, documentary, and more. Every image is unique.',
  },
  {
    icon: <Subtitles size={22} />,
    title: 'Smart Subtitles',
    description:
      'Word-by-word animated captions with 6 fonts, custom colors, and effects.',
  },
  {
    icon: <Calendar size={22} />,
    title: 'Multi-Platform Scheduling',
    description:
      'Schedule or auto-post to TikTok, Instagram Reels, YouTube Shorts, and X.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Unified Analytics',
    description:
      'Track views, likes, watch rate, and growth across all platforms in one dashboard.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Full Autopilot',
    description:
      'Set your niche, schedule, and style. AI creates and posts videos automatically.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Multi-Language',
    description:
      'Generate content in 20+ languages. Reach global audiences effortlessly.',
  },
]

function FeatureBlock() {
  return (
    <section id="features" className="py-20 relative">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[var(--accent)] mb-3">
            Features
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
            Everything you need to go viral
          </h2>
          <p className="text-[16px] text-[var(--text-secondary)] mt-3 max-w-[500px] mx-auto">
            One platform replaces your entire video production workflow.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="p-5 rounded-[14px] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-subtle)] transition-all group cursor-default"
            >
              <div className="w-10 h-10 rounded-[9px] bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mb-3 group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">
                {feature.title}
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { FeatureBlock }
