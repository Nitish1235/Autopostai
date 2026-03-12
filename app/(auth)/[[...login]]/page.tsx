'use client'

import { SignIn } from '@clerk/nextjs'
import { motion } from 'framer-motion'
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

// ── Login Page ────────────────────────────────────────
export default function LoginPage() {
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
          className="w-full max-w-[400px] flex items-center justify-center"
        >
          <SignIn appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none border border-[rgba(255,255,255,0.06)] rounded-xl",
              headerTitle: "text-[#F5F5F7]",
              headerSubtitle: "text-[rgba(245,245,247,0.45)]",
              socialButtonsBlockButton: "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F7]",
              socialButtonsBlockButtonText: "text-[#F5F5F7] font-medium",
              dividerLine: "bg-[rgba(255,255,255,0.06)]",
              dividerText: "text-[rgba(245,245,247,0.25)]",
              formFieldLabel: "text-[#F5F5F7]",
              formFieldInput: "bg-[#0D0D11] border-[rgba(255,255,255,0.12)] text-[#F5F5F7]",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white",
              footerActionText: "text-[rgba(245,245,247,0.45)]",
              footerActionLink: "text-blue-500 hover:text-blue-400"
            }
          }} />
        </motion.div>
      </div>
    </div>
  )
}
