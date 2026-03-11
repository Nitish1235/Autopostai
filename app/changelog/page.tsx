import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog — AutoPost AI',
  description:
    'See what\'s new in AutoPost AI. Latest updates, features, and improvements.',
}

const ENTRIES = [
  {
    version: 'v1.3.0',
    date: 'March 11, 2026',
    title: 'QStash Background Jobs',
    changes: [
      'Migrated background job processing to Upstash QStash for better reliability',
      'Eliminated Redis connection timeouts on Cloud Run',
      'Added automatic retry with exponential backoff for failed jobs',
    ],
  },
  {
    version: 'v1.2.0',
    date: 'March 1, 2026',
    title: 'AI Video Generation (Sora 2)',
    changes: [
      'New AI-generated video mode powered by Sora 2',
      'Choose to keep AI audio or replace with custom voiceover',
      'Background music mixing with adjustable volume',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'February 15, 2026',
    title: 'Autopilot Mode',
    changes: [
      'Full autopilot — set your niche, schedule, and let AI handle everything',
      'Weekly posting schedule with per-day customization',
      'Auto-publish or review-before-post modes',
      'Topic queue management with priority ordering',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'January 20, 2026',
    title: 'Initial Launch',
    changes: [
      'AI script generation with GPT-4o',
      '8+ image styles: realistic, anime, cinematic, watercolor, and more',
      'Natural voiceovers with word-level subtitle sync',
      'One-click publishing to TikTok, Instagram, YouTube, and X',
      'Video preview and customization before publishing',
      'Unified analytics dashboard',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      <div className="max-w-[720px] mx-auto px-6 py-24">
        <h1
          className="text-[36px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          Changelog
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          All the latest updates, features, and improvements to AutoPost AI.
        </p>

        <div className="mt-12 space-y-10">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="relative pl-6 border-l-2" style={{ borderColor: 'var(--border)' }}>
              {/* Dot */}
              <div
                className="absolute -left-[7px] top-1 w-3 h-3 rounded-full"
                style={{ backgroundColor: 'rgb(59,130,246)' }}
              />

              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    color: 'rgb(96,165,250)',
                  }}
                >
                  {entry.version}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
                  {entry.date}
                </span>
              </div>

              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {entry.title}
              </h2>

              <ul className="mt-3 space-y-1.5">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-[14px] leading-relaxed flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  )
}
