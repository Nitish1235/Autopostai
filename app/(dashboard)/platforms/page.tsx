'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plug2, RefreshCw } from 'lucide-react'
import { PlatformCard, type PlatformStatus } from '@/components/platforms/PlatformCard'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { getDailyPostLimit, type PlanId } from '@/lib/utils/plans'
import type { Platform } from '@/types'

const ALL_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'x']

function PlatformAlerts() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      toast({ message: `Successfully connected ${success}`, type: 'success' })
      router.replace('/platforms')
    } else if (error) {
      toast({ message: `Failed to connect: ${error}`, type: 'error' })
      router.replace('/platforms')
    }
  }, [searchParams, toast, router])

  return null
}

export default function PlatformsPage() {
  const { toast } = useToast()
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userPlan, setUserPlan] = useState<PlanId>('free')

  const fetchPlatforms = useCallback(async () => {
    try {
      const [platformRes, userRes] = await Promise.all([
        fetch('/api/platforms/status'),
        fetch('/api/user'),
      ])
      const platformData = await platformRes.json()
      const userData = await userRes.json()

      if (platformData.success) setPlatforms(platformData.data)
      if (userData.success && userData.data?.plan) {
        setUserPlan(userData.data.plan as PlanId)
      }
    } catch {
      toast({ message: 'Failed to load platforms', type: 'error' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPlatforms()
  }, [fetchPlatforms])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPlatforms()
  }

  const handleConnect = async (platform: Platform) => {
    try {
      const res = await fetch(`/api/platforms/connect/${platform}`)
      const data = await res.json()
      
      if (data.success && data.data?.authUrl) {
        window.location.href = data.data.authUrl
      } else {
        toast({ message: data.error || 'Failed to initiate connection', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error while connecting', type: 'error' })
    }
  }

  const handleDisconnect = async (platform: Platform) => {
    try {
      const res = await fetch('/api/platforms/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json()
      if (data.success) {
        setPlatforms((prev) =>
          prev.map((p) =>
            p.platform === platform
              ? { ...p, connected: false, healthStatus: 'disconnected' as const }
              : p
          )
        )
        toast({ message: `${platform} disconnected`, type: 'success' })
      } else {
        toast({ message: data.error || 'Failed to disconnect', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    }
  }

  const handleSettingsUpdate = async (
    platform: Platform,
    settings: { autoPost?: boolean; dailyLimit?: number; postWindow?: string }
  ) => {
    try {
      const res = await fetch(`/api/platforms/${platform}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setPlatforms((prev) =>
          prev.map((p) =>
            p.platform === platform ? { ...p, ...settings } : p
          )
        )
      } else {
        toast({ message: data.error || 'Failed to update', type: 'error' })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    }
  }

  // Build full list: connected ones first, then stubs for unconnected platforms
  const connectedPlatforms = new Set(platforms.map((p) => p.platform))
  const fullList: PlatformStatus[] = [
    ...platforms,
    ...ALL_PLATFORMS.filter((p) => !connectedPlatforms.has(p)).map(
      (platform): PlatformStatus => ({
        id: `stub-${platform}`,
        platform,
        connected: false,
        displayName: null,
        handle: null,
        avatarUrl: null,
        followerCount: null,
        autoPost: false,
        dailyLimit: getDailyPostLimit(userPlan),
        postWindow: null,
        tokenExpiry: null,
        isExpired: false,
        daysUntilExpiry: null,
        healthStatus: 'disconnected',
        throttleActive: false,
        lastPostAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ),
  ]

  const connectedCount = platforms.filter((p) => p.connected).length

  return (
    <div className="px-8 py-7 max-w-[1200px]">
      <Suspense fallback={null}>
        <PlatformAlerts />
      </Suspense>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
            Connected Platforms
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {connectedCount} of {ALL_PLATFORMS.length} platforms connected
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={refreshing}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={280} rounded="lg" />
          ))}
        </div>
      ) : fullList.length === 0 ? (
        <EmptyState
          icon={<Plug2 size={40} />}
          title="No platforms available"
          description="Something went wrong. Try refreshing."
          action={{ label: 'Retry', onClick: handleRefresh }}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {fullList.map((p) => (
              <PlatformCard
                key={p.platform}
                data={p}
                plan={userPlan}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSettingsUpdate={handleSettingsUpdate}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
