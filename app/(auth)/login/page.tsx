'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-[#09090b] text-white overflow-hidden">
      {/* ── Left Side: Login Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[480px] xl:w-[560px] relative z-10 border-r border-white/5">
        <div className="mx-auto w-full max-w-sm lg:w-[380px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="mb-12">
              <Logo size="lg" />
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#FAFAFA]">
                Welcome back
              </h1>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                Sign in to your account to continue building automated faceless channels.
              </p>
            </div>

            <Button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] shadow-sm font-semibold py-6 rounded-xl transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-none shrink-0" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-[#71717A] w-full">
              By clicking continue, you agree to our{' '}
              <a href="/terms" className="underline hover:text-white transition-colors">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</a>.
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Side: Aesthetic Graphic ── */}
      <div className="hidden lg:flex flex-1 relative bg-[#09090b] items-center justify-center p-12">
        {/* Abstract shapes & glows */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] mix-blend-screen" />
        </div>
        
        {/* Modern Web Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] z-0" />

        {/* Floating Glassmorphic Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-xl 2xl:max-w-2xl"
        >
          <div className="bg-[#18181b]/50 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl relative">
            {/* Edge highlights */}
            <div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <div className="absolute -bottom-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            
            {/* Header / Brand Badge */}
            <div className="flex items-center gap-5 mb-10">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-[2px] shadow-lg shadow-purple-500/20">
                <div className="bg-black/80 w-full h-full rounded-[14px] flex items-center justify-center">
                  <span className="text-2xl">⚡️</span>
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xl tracking-tight">Autopilot Engine</h3>
                <p className="text-[#A1A1AA] text-sm mt-0.5">Your personal content factory.</p>
              </div>
            </div>

            {/* Stats / Features Layout */}
            <div className="space-y-4 mb-10">
              {[
                { label: 'AI Script Generation', val: 'Active', color: 'text-emerald-400' },
                { label: 'Voiceover Synthesis', val: 'Premium', color: 'text-blue-400' },
                { label: 'Multi-platform Publish', val: 'Synced', color: 'text-purple-400' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center px-5 py-4 rounded-xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                  <span className="text-[#A1A1AA] text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')} animate-pulse`} />
                    <span className="text-white font-medium text-sm">{item.val}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Testimonial Section */}
            <div className="pt-8 border-t border-white/5">
              <p className="text-xl font-medium text-white/90 leading-relaxed tracking-tight">
                "AutoPost AI turned a 5-hour weekly video editing grind into a simple 5-minute approval process. Absolute game changer."
              </p>
              <div className="flex items-center gap-4 mt-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600" />
                <div>
                  <p className="text-sm font-semibold text-white">Sarah Jenkins</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Faceless Channel Creator</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

