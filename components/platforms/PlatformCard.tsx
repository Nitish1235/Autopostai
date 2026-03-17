'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Unplug,
  Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_COLORS } from '@/lib/utils/constants'
import { getDailyPostLimit, type PlanId } from '@/lib/utils/plans'
import type { Platform } from '@/types'

type HealthStatus = 'healthy' | 'expiring' | 'expired' | 'disconnected' | 'throttled'

interface PlatformStatus {
  id: string
  platform: Platform
  connected: boolean
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  followerCount: number | null
  autoPost: boolean
  dailyLimit: number
  postWindow: string | null
  tokenExpiry: string | null
  isExpired: boolean
  daysUntilExpiry: number | null
  healthStatus: HealthStatus
  throttleActive: boolean
  lastPostAt: string | null
  createdAt: string
  updatedAt: string
}

interface PlatformCardProps {
  data: PlatformStatus
  plan: PlanId
  onConnect: (platform: Platform) => void
  onDisconnect: (platform: Platform) => void
  onSettingsUpdate: (platform: Platform, settings: { autoPost?: boolean; dailyLimit?: number; postWindow?: string }) => void
}

const PLATFORM_INFO: Record<Platform, { label: string; icon: string; connectPath: string }> = {
  tiktok: { label: 'TikTok', icon: '🎵', connectPath: '/api/platforms/connect/tiktok' },
  instagram: { label: 'Instagram', icon: '📸', connectPath: '/api/platforms/connect/instagram' },
  youtube: { label: 'YouTube', icon: '▶️', connectPath: '/api/platforms/connect/youtube' },
  x: { label: 'X', icon: '𝕏', connectPath: '/api/platforms/connect/x' },
}

const HEALTH_CONFIG: Record<
  HealthStatus,
  { icon: React.ReactNode; label: string; badgeVariant: 'success' | 'warning' | 'danger' | 'dim' }
> = {
  healthy: {
    icon: <CheckCircle2 size={14} />,
    label: 'Healthy',
    badgeVariant: 'success',
  },
  expiring: {
    icon: <ShieldAlert size={14} />,
    label: 'Token Expiring',
    badgeVariant: 'warning',
  },
  expired: {
    icon: <ShieldX size={14} />,
    label: 'Token Expired',
    badgeVariant: 'danger',
  },
  disconnected: {
    icon: <Unplug size={14} />,
    label: 'Disconnected',
    badgeVariant: 'dim',
  },
  throttled: {
    icon: <AlertTriangle size={14} />,
    label: 'Throttled',
    badgeVariant: 'warning',
  },
}

function formatFollowers(n: number | null): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function PlatformCard({ data, plan, onConnect, onDisconnect, onSettingsUpdate }: PlatformCardProps) {
  const { toast } = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [autoPost, setAutoPost] = useState(data.autoPost)
  const [dailyLimit, setDailyLimit] = useState(data.dailyLimit)

  const planMax = getDailyPostLimit(plan)   // slider max from plan
  const isFree = plan === 'free'

  const info = PLATFORM_INFO[data.platform]
  const health = HEALTH_CONFIG[data.healthStatus]
  const color = PLATFORM_COLORS[data.platform]

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      onDisconnect(data.platform)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSaveSettings = () => {
    onSettingsUpdate(data.platform, { autoPost, dailyLimit })
    setSettingsOpen(false)
    toast({ message: 'Settings saved', type: 'success' })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card padding="none" hover>
          {/* Color accent top bar */}
          <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: color }} />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[20px]"
                  style={{ backgroundColor: `${color}15` }}
                >
                  {info.icon}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {info.label}
                  </h3>
                  {data.connected && data.handle && (
                    <p className="text-[12px] text-[var(--text-secondary)]">
                      @{data.handle}
                    </p>
                  )}
                </div>
              </div>

              <Badge
                variant={health.badgeVariant}
                size="sm"
                dot={data.healthStatus === 'healthy'}
              >
                {health.label}
              </Badge>
            </div>

            {data.connected ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface-hover)]">
                    <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                      Followers
                    </p>
                    <p className="text-[16px] font-bold text-[var(--text-primary)] mt-0.5">
                      {formatFollowers(data.followerCount)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface-hover)]">
                    <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                      Daily Limit
                    </p>
                    <p className="text-[16px] font-bold text-[var(--text-primary)] mt-0.5">
                      {data.dailyLimit}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-[var(--surface-hover)]">
                    <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                      Last Post
                    </p>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] mt-0.5">
                      {formatTimeAgo(data.lastPostAt)}
                    </p>
                  </div>
                </div>

                {/* Quick toggles */}
                <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)]">
                  <span className="text-[12px] text-[var(--text-secondary)]">Auto-post</span>
                  {isFree ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                      <Lock size={11} />
                      <span>Upgrade to enable</span>
                    </div>
                  ) : (
                    <Toggle
                      checked={autoPost}
                      onChange={(v) => {
                        setAutoPost(v)
                        onSettingsUpdate(data.platform, { autoPost: v })
                      }}
                      size="sm"
                    />
                  )}
                </div>

                {/* Warnings */}
                {data.healthStatus === 'expiring' && data.daysUntilExpiry !== null && (
                  <div className="mt-3 p-2.5 rounded-[8px] bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} className="text-[var(--warning)]" />
                      <p className="text-[11px] text-[var(--warning)]">
                        Token expires in {data.daysUntilExpiry} days.{' '}
                        <a
                          href={info.connectPath}
                          className="underline font-medium"
                        >
                          Re-authenticate
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {data.healthStatus === 'expired' && (
                  <div className="mt-3 p-2.5 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
                    <div className="flex items-center gap-1.5">
                      <ShieldX size={13} className="text-[var(--danger)]" />
                      <p className="text-[11px] text-[var(--danger)]">
                        Token expired.{' '}
                        <a
                          href={info.connectPath}
                          className="underline font-medium"
                        >
                          Re-authenticate now
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {data.throttleActive && (
                  <div className="mt-3 p-2.5 rounded-[8px] bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-[var(--warning)]" />
                      <p className="text-[11px] text-[var(--warning)]">
                        Rate limited. Posts may be delayed.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                    className="flex-1"
                    leftIcon={<Settings2 size={14} />}
                  >
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    loading={disconnecting}
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              /* Disconnected state */
              <div className="text-center py-5">
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                  Connect your {info.label} account to start posting
                </p>
                <Button
                  onClick={() => onConnect(data.platform)}
                  leftIcon={<ExternalLink size={14} />}
                >
                  Connect {info.label}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Settings Modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={`${info.label} Settings`}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Auto-post toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                Auto-post
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Automatically publish scheduled posts
              </p>
            </div>
            <Toggle
              checked={autoPost}
              onChange={setAutoPost}
              size="md"
            />
          </div>

          {/* Daily limit slider — hidden for free plan */}
          {isFree ? (
            <div className="p-3 rounded-[10px] bg-[var(--surface-hover)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Lock size={13} className="text-[var(--text-dim)]" />
                <div>
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Daily Post Limit</p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                    Upgrade to Starter ($19/mo) to unlock 1 post/day
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Slider
              label={`Daily Post Limit (max ${planMax} on your plan)`}
              value={Math.min(dailyLimit, planMax)}
              onChange={setDailyLimit}
              min={1}
              max={planMax}
              step={1}
              showValue
            />
          )}

          {/* Account info */}
          {data.displayName && (
            <div className="p-3 rounded-[8px] bg-[var(--surface-hover)]">
              <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider mb-1">
                Connected Account
              </p>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {data.displayName}
              </p>
              {data.handle && (
                <p className="text-[12px] text-[var(--text-secondary)]">
                  @{data.handle}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export { PlatformCard }
export type { PlatformStatus }
