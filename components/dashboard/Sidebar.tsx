'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Plus,
  Film,
  Calendar,
  Zap,
  Share2,
  BarChart2,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CreditBadge } from '@/components/dashboard/CreditBadge'
import { Logo } from '@/components/ui/Logo'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  special?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
      { label: 'Create Video', href: '/create', icon: <Plus size={16} />, special: true },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { label: 'My Videos', href: '/videos', icon: <Film size={16} /> },
      { label: 'Autopilot', href: '/autopilot', icon: <Zap size={16} /> },
    ],
  },
  {
    label: 'GROWTH',
    items: [
      { label: 'Platforms', href: '/platforms', icon: <Share2 size={16} /> },
      // Analytics hidden — backend logic preserved, UI coming soon
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ],
  },
]

/* ── Sidebar content (shared between desktop & mobile) ── */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Logo */}
      <div className="h-[56px] flex items-center px-5 border-b border-[var(--border)] shrink-0">
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-2 pt-4 pb-1 text-[9px] font-semibold tracking-[2px] uppercase text-[var(--text-dim)]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isCreate = item.special

              if (isCreate) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium mb-0.5',
                      'transition-all duration-[120ms]',
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium mb-0.5',
                    'transition-all duration-[120ms] cursor-pointer',
                    isActive
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-l-2 border-[var(--accent)] pl-[10px]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] shrink-0">
        <CreditBadge />
      </div>
    </>
  )
}

/* ── Main Sidebar component ──────────────────────────── */

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => {
    onMobileClose()
  }, [pathname, onMobileClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      {/* ── Desktop sidebar (always visible on lg+) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[220px] flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] z-40">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-[998] lg:hidden"
              onClick={onMobileClose}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-[280px] flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] z-[999] lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer z-10"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export { Sidebar }
