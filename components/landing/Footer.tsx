import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Changelog', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/policy' },
    { label: 'Terms of Service', href: '/terms-service' },
    { label: 'Cookie Policy', href: '/policy' },
  ],
  Social: [
    { label: 'Twitter / X', href: '#' },
    { label: 'YouTube', href: '#' },
    { label: 'TikTok', href: '#' },
    { label: 'Discord', href: '#' },
  ],
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-card)]">
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <Logo size="sm" />
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-[200px]">
              AI-powered short-form video creation and multi-platform publishing.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-3">
                {title}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--text-dim)]">
            © {new Date().getFullYear()} AutoPost AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/policy" className="text-[11px] text-[var(--text-dim)] hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-service" className="text-[11px] text-[var(--text-dim)] hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span className="text-[11px] text-[var(--text-dim)] ml-4 border-l border-[var(--border)] pl-4">
              Built with ❤️ for creators
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { Footer }
