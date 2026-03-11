import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — AutoPost AI',
  description:
    'Tips, tutorials, and insights on AI video creation, social media growth, and content automation.',
}

const POSTS = [
  {
    title: 'How to Grow a Faceless TikTok Account in 2026',
    excerpt:
      'Faceless content is booming. Learn how creators are using AI to build viral TikTok accounts without ever showing their face.',
    date: 'March 10, 2026',
    tag: 'Growth',
  },
  {
    title: '5 Niches That Work Best for AI-Generated Videos',
    excerpt:
      'Not all niches are created equal. We break down the top 5 niches where AI-generated short-form videos perform best.',
    date: 'March 5, 2026',
    tag: 'Strategy',
  },
  {
    title: 'The Complete Guide to Multi-Platform Posting',
    excerpt:
      'Posting to TikTok, Instagram, YouTube, and X simultaneously? Here\'s how to optimize your content for each platform.',
    date: 'February 28, 2026',
    tag: 'Tutorial',
  },
  {
    title: 'AI Voice vs Human Voice: What Performs Better?',
    excerpt:
      'We analyzed 10,000 short-form videos to find out whether AI-generated voiceovers outperform human narration.',
    date: 'February 20, 2026',
    tag: 'Research',
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      <div className="max-w-[720px] mx-auto px-6 py-24">
        <h1
          className="text-[36px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          Blog
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          Tips, tutorials, and insights on AI video creation and social media growth.
        </p>

        <div className="mt-12 space-y-8">
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="p-6 rounded-xl border transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    color: 'rgb(96,165,250)',
                  }}
                >
                  {post.tag}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
                  {post.date}
                </span>
              </div>
              <h2
                className="text-[18px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {post.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>
          More posts coming soon. Stay tuned!
        </p>
      </div>

      <Footer />
    </main>
  )
}
