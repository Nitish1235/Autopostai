'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff, Zap } from 'lucide-react'

export default function AdminLoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()
            if (data.success) {
                router.push('/admin')
            } else {
                setError(data.error || 'Login failed')
            }
        } catch {
            setError('Network error. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[400px]">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Zap size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">
                        Admin Panel
                    </span>
                </div>

                {/* Card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 shadow-2xl"
                >
                    <h1 className="text-lg font-semibold text-white mb-1">Welcome back</h1>
                    <p className="text-sm text-[#888] mb-6">
                        Sign in to access the admin dashboard
                    </p>

                    {error && (
                        <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Username */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                            Username
                        </label>
                        <div className="relative">
                            <User
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
                            />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm placeholder:text-[#444] focus:border-violet-500/50 focus:outline-none transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="mb-6">
                        <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
                            />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm placeholder:text-[#444] focus:border-violet-500/50 focus:outline-none transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors cursor-pointer"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !username || !password}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
