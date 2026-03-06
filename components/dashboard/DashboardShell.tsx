'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionProvider } from 'next-auth/react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'

interface DashboardShellProps {
  children: React.ReactNode
}

function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        {/* ml-[220px] on desktop, no margin on mobile */}
        <div className="flex-1 lg:ml-[220px]">
          <TopBar onMobileMenuToggle={() => setMobileMenuOpen(true)} />
          <main className="pt-[56px] min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}

export { DashboardShell }
