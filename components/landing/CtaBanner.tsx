'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

function CtaBanner() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[20px] p-10 md:p-14 text-center bg-gradient-to-br from-[var(--accent)]/10 via-[var(--bg-card)] to-[var(--accent)]/5 border border-[var(--accent-border)]"
        >
          {/* Background glows */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[var(--accent)] opacity-[0.08] blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-[var(--accent)] opacity-[0.05] blur-[80px]" />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[12px] font-medium mb-5">
              <Sparkles size={12} />
              Limited Offer — 10 Free Credits
            </div>

            <h2 className="text-[32px] md:text-[42px] font-bold text-[var(--text-primary)] leading-tight max-w-[600px] mx-auto">
              Ready to create your
              <br />
              first viral video?
            </h2>

            <p className="text-[15px] text-[var(--text-secondary)] mt-4 max-w-[450px] mx-auto">
              Join 2,000+ creators using AutoPost AI to grow their audience on
              autopilot. No credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <Link href="/login">
                <Button size="lg" rightIcon={<ArrowRight size={16} />}>
                  Start Creating — It&apos;s Free
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-[var(--text-dim)] mt-4">
              No credit card required · Cancel anytime · 10 free videos
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { CtaBanner }
