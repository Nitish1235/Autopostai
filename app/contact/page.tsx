import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — AutoPost AI',
  description:
    'Get in touch with the AutoPost AI team. We\'re here to help with questions, feedback, and partnership inquiries.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      <div className="max-w-[720px] mx-auto px-6 py-24">
        <h1
          className="text-[36px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          Contact Us
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          Have a question, suggestion, or just want to say hi? We'd love to hear from you.
        </p>

        <div className="mt-12 space-y-8">
          {/* Email */}
          <div
            className="p-6 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              📧 Email
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              For general inquiries and support:
            </p>
            <a
              href="mailto:hello@autopostai.video"
              className="mt-2 inline-block text-[14px] text-blue-400 hover:underline"
            >
              hello@autopostai.video
            </a>
          </div>

          {/* Business */}
          <div
            className="p-6 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              🤝 Partnerships
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Interested in partnerships, integrations, or business opportunities?
            </p>
            <a
              href="mailto:partners@autopostai.video"
              className="mt-2 inline-block text-[14px] text-blue-400 hover:underline"
            >
              partners@autopostai.video
            </a>
          </div>

          {/* Support */}
          <div
            className="p-6 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              🛠 Technical Support
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Having trouble with your account or a specific feature? We typically respond within 24 hours.
            </p>
            <a
              href="mailto:support@autopostai.video"
              className="mt-2 inline-block text-[14px] text-blue-400 hover:underline"
            >
              support@autopostai.video
            </a>
          </div>

          {/* Social */}
          <div
            className="p-6 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              🌐 Follow Us
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Stay updated with the latest features, tips, and announcements.
            </p>
            <div className="mt-3 flex gap-4">
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-400 hover:underline">Twitter / X</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-400 hover:underline">YouTube</a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-400 hover:underline">TikTok</a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
