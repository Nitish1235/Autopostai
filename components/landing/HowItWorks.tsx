'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Wand2, Film, Share2 } from 'lucide-react'

const STEPS = [
  {
    icon: <MessageSquare size={24} />,
    title: 'Pick a Topic',
    description:
      'Enter any topic or let AI suggest trending ones in your niche. Choose format and duration.',
    color: 'var(--accent)',
  },
  {
    icon: <Wand2 size={24} />,
    title: 'AI Generates Everything',
    description:
      'Script, voiceover, images, music, and subtitles — all generated in under 2 minutes.',
    color: '#00F2EA',
  },
  {
    icon: <Film size={24} />,
    title: 'Preview & Customize',
    description:
      'Fine-tune your video with real-time preview. Edit script, change styles, adjust subtitles.',
    color: '#E1306C',
  },
  {
    icon: <Share2 size={24} />,
    title: 'Post Everywhere',
    description:
      'One-click publish to TikTok, Instagram, YouTube Shorts, and X. Schedule or autopilot.',
    color: '#FF0000',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[var(--accent)] mb-3">
            How It Works
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
            Topic to TikTok in 4 steps
          </h2>
          <p className="text-[16px] text-[var(--text-secondary)] mt-3 max-w-[500px] mx-auto">
            No editing skills required. Just pick a topic and let AI do the rest.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative p-6 rounded-[14px] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all group"
            >
              {/* Step number */}
              <div className="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center">
                <span className="text-[11px] font-bold text-[var(--text-dim)]">
                  {i + 1}
                </span>
              </div>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${step.color}15`, color: step.color }}
              >
                {step.icon}
              </div>

              <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">
                {step.title}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {step.description}
              </p>

              {/* Connector line (not on last) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[var(--border)]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { HowItWorks }
