import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — AutoPost AI',
  description:
    'Learn about AutoPost AI — the AI-powered platform that helps creators generate and publish faceless short-form videos on autopilot.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      <div className="max-w-[720px] mx-auto px-6 py-24">
        <h1
          className="text-[36px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          About AutoPost AI
        </h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>
            AutoPost AI is an AI-powered content creation platform built for the creator economy.
            We help creators, brands, and marketers generate high-quality short-form videos
            and publish them across TikTok, Instagram Reels, YouTube Shorts, and X — all on autopilot.
          </p>

          <h2 className="text-[22px] font-semibold mt-10" style={{ color: 'var(--text-primary)' }}>
            Our Mission
          </h2>
          <p>
            Content creation shouldn't require a studio, a team, or hours of editing.
            We believe every creator deserves access to professional-quality video tools.
            AutoPost AI makes it possible to go from a single topic to a fully produced,
            published video in under 5 minutes.
          </p>

          <h2 className="text-[22px] font-semibold mt-10" style={{ color: 'var(--text-primary)' }}>
            What We Do
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>AI Script Generation</strong> — GPT-4o writes engaging,
              platform-optimized scripts from your topic.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Visual Generation</strong> — AI creates stunning visuals
              in 8+ styles: realistic, anime, cinematic, and more.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Natural Voiceovers</strong> — Ultra-realistic AI voices
              with word-level subtitle sync.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>One-Click Publishing</strong> — Post to TikTok, Instagram,
              YouTube, and X simultaneously.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Full Autopilot</strong> — Schedule your niche, set your
              posting times, and let AI handle everything.
            </li>
          </ul>

          <h2 className="text-[22px] font-semibold mt-10" style={{ color: 'var(--text-primary)' }}>
            Built for Creators
          </h2>
          <p>
            Whether you're a solo creator growing your first channel or a brand managing
            multiple accounts, AutoPost AI scales with you. Our platform handles the heavy
            lifting so you can focus on what matters — connecting with your audience.
          </p>

          <h2 className="text-[22px] font-semibold mt-10" style={{ color: 'var(--text-primary)' }}>
            Contact Us
          </h2>
          <p>
            Have questions, feedback, or partnership inquiries? Reach out at{' '}
            <a href="mailto:hello@autopostai.video" className="text-blue-400 hover:underline">
              hello@autopostai.video
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
