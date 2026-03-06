'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    Zap,
    Video,
    Music,
    Palette,
    LogOut,
    LayoutDashboard,
    Mic,
} from 'lucide-react'

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin#videos', label: 'Showcase Videos', icon: Video },
    { href: '/admin#music', label: 'Music Library', icon: Music },
    { href: '/admin#styles', label: 'Image Styles', icon: Palette },
    { href: '/admin#voices', label: 'Voice Previews', icon: Mic },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [verified, setVerified] = useState(false)

    // Skip auth check on login page
    const isLoginPage = pathname === '/admin/login'

    useEffect(() => {
        if (isLoginPage) {
            setVerified(true)
            return
        }

        // Verify admin auth by calling an admin-only endpoint
        fetch('/api/admin/videos')
            .then((res) => {
                if (res.status === 401) {
                    router.replace('/admin/login')
                } else {
                    setVerified(true)
                }
            })
            .catch(() => {
                router.replace('/admin/login')
            })
    }, [isLoginPage, router])

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' })
        router.replace('/admin/login')
    }

    // Login page — no sidebar
    if (isLoginPage) {
        return <>{children}</>
    }

    if (!verified) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Sidebar */}
            <aside className="w-[240px] border-r border-[#1e1e2e] bg-[#0d0d14] flex flex-col fixed inset-y-0 left-0 z-40">
                {/* Logo */}
                <div className="h-16 flex items-center gap-2 px-5 border-b border-[#1e1e2e]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">
                        Admin Panel
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href.split('#')[0]
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${isActive
                                    ? 'bg-violet-500/10 text-violet-400'
                                    : 'text-[#888] hover:text-white hover:bg-[#1a1a2e]'
                                    }`}
                            >
                                <Icon size={16} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-[#1e1e2e]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#888] hover:text-red-400 hover:bg-red-500/10 transition-colors w-full cursor-pointer"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-[240px] min-h-screen">
                {children}
            </main>
        </div>
    )
}
