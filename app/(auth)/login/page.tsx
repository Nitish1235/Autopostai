'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

// ── Floating Video Card ───────────────────────────────
function FloatingCard({
  gradient,
  title,
  views,
  delay,
  y,
}: {
  gradient: string
  title: string
  views: string
  delay: number
  y: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: y + 20 }}
      animate={{
        opacity: 1,
        y: [y, y - 12, y],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
      }}
      className="w-[140px] rounded-[14px] overflow-hidden border border-[rgba(255,255,255,0.08)]"
      style={{ aspectRatio: '9/16' }}
    >
      <div
        className="relative w-full h-full flex flex-col justify-end p-3"
        style={{ background: gradient }}
      >
        <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[8px] font-semibold"
          style={{ backgroundColor: '#00F2EA', color: '#000' }}>
          TikTok
        </div>
        <div className="mt-auto">
          <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">
            {title}
          </p>
          <p className="text-[rgba(255,255,255,0.6)] text-[9px] mt-1 flex items-center gap-1">
            <span>▶</span> {views}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Google Logo SVG ───────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ── Login Page ────────────────────────────────────────
export default function LoginPage() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0D0D11' }}>
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        {/* Background radial gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(59,130,246,0.1) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(59,130,246,0.05) 0%, transparent 50%)',
          }}
        />

        {/* Floating video cards */}
        <div className="relative flex gap-4 items-start">
          <FloatingCard
            gradient="linear-gradient(160deg, #1a1a2e, #16213e, #0f3460)"
            title="The fall of the Roman Empire"
            views="1.1M views"
            delay={0}
            y={40}
          />
          <FloatingCard
            gradient="linear-gradient(160deg, #2d1b69, #11998e, #38ef7d)"
            title="Inside Area 51: The untold story"
            views="847K views"
            delay={0.3}
            y={0}
          />
          <FloatingCard
            gradient="linear-gradient(160deg, #0f0c29, #302b63, #24243e)"
            title="Why rich people think differently"
            views="612K views"
            delay={0.6}
            y={60}
          />
        </div>

        {/* Brand watermark */}
        <div className="absolute bottom-8 left-8 opacity-30">
          <Logo size="sm" href={undefined} />
        </div>
      </div>

      {/* Right login panel */}
      <div
        className="w-full lg:w-[480px] flex flex-col items-center justify-center px-8"
        style={{ backgroundColor: '#1C1C22' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[360px]"
        >
          {/* Logo */}
          <Logo size="md" href={undefined} />

          {/* Headline */}
          <h1
            className="text-[28px] font-bold mt-8"
            style={{
              color: '#F5F5F7',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            Welcome back
          </h1>
          <p
            className="text-[14px] mt-2"
            style={{ color: 'rgba(245,245,247,0.45)' }}
          >
            Sign in to your account
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full h-[44px] rounded-[8px] flex items-center justify-center gap-3 mt-8 transition-colors duration-150 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F5F5F7',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255,255,255,0.06)'
            }}
          >
            <GoogleLogo />
            <span className="text-[14px] font-medium">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-6">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            />
            <span
              className="text-[11px]"
              style={{ color: 'rgba(245,245,247,0.25)' }}
            >
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            />
          </div>

          {/* Fine print */}
          <p
            className="text-center mt-8 text-[11px] leading-relaxed"
            style={{ color: 'rgba(245,245,247,0.25)' }}
          >
            By signing in, you agree to our{' '}
            <Link
              href="/terms-service"
              className="underline hover:text-[rgba(245,245,247,0.5)] transition-colors"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/policy"
              className="underline hover:text-[rgba(245,245,247,0.5)] transition-colors"
            >
              Privacy Policy
            </Link>
          </p>

          {/* New user note */}
          <p
            className="text-center mt-4 text-[11px] leading-relaxed"
            style={{ color: 'rgba(245,245,247,0.25)' }}
          >
            No account needed — Google sign-in creates your account
            automatically.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
