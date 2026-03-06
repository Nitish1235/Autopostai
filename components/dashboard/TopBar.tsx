'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { signOut, useSession } from 'next-auth/react'
import { Sun, Moon, Bell, Settings, CreditCard, LogOut, Menu } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils/cn'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/create': 'Create Video',
  '/videos': 'My Videos',
  '/schedule': 'Schedule',
  '/autopilot': 'Autopilot',
  '/platforms': 'Platforms',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

interface TopBarProps {
  onMobileMenuToggle?: () => void
}

function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  const pageTitle =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ||
    'Dashboard'

  const user = session?.user
  const isDark = theme !== 'light'

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[220px] h-[56px] bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border)] z-30 flex items-center px-4 sm:px-6 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 -ml-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-2 h-8 px-3 rounded-full bg-[var(--bg-card)] border border-[var(--border)] transition-colors cursor-pointer hover:border-[var(--border-hover)]"
        >
          <Sun
            size={14}
            className={cn(
              'transition-opacity',
              isDark ? 'opacity-40 text-[var(--text-dim)]' : 'opacity-100 text-[var(--accent)]'
            )}
          />
          <Moon
            size={14}
            className={cn(
              'transition-opacity',
              isDark ? 'opacity-100 text-[var(--accent)]' : 'opacity-40 text-[var(--text-dim)]'
            )}
          />
        </button>

        {/* Notification bell */}
        <button className="relative p-2 rounded-[7px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
          <Bell size={18} />
          {/* Unread dot — can be toggled later */}
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
        </button>

        {/* Avatar + dropdown */}
        <Dropdown
          align="right"
          trigger={
            <Avatar
              src={user?.image}
              name={user?.name || user?.email || ''}
              size="sm"
              className="cursor-pointer"
            />
          }
          items={[
            {
              label: user?.name || 'User',
              icon: undefined,
              onClick: undefined,
            },
            { label: '', divider: true },
            {
              label: 'Settings',
              icon: <Settings size={14} />,
              href: '/settings',
            },
            {
              label: 'Billing',
              icon: <CreditCard size={14} />,
              href: '/settings?tab=subscription',
            },
            { label: '', divider: true },
            {
              label: 'Sign out',
              icon: <LogOut size={14} />,
              variant: 'danger' as const,
              onClick: () => signOut({ callbackUrl: '/login' }),
            },
          ]}
        />
      </div>
    </header>
  )
}

export { TopBar }
