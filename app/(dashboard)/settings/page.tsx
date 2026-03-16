'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  User,
  CreditCard,
  Bell,
  Sliders,
  ExternalLink,
  Crown,
  Shield,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dropdown } from '@/components/ui/dropdown'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import { NICHES, VOICES, IMAGE_STYLES } from '@/lib/utils/constants'
import type { Plan, VideoFormat, ImageStyle } from '@/types'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'notifications', label: 'Notifications' },
]

const FORMAT_OPTIONS: { id: VideoFormat; label: string }[] = [
  { id: '30s', label: '30 seconds' },
  { id: '60s', label: '60 seconds' },
  { id: '90s', label: '90 seconds' },
]

const PLAN_INFO: Record<
  Plan,
  { label: string; color: string; credits: number }
> = {
  free: { label: 'Free', color: 'var(--text-secondary)', credits: 1 },
  starter: { label: 'Starter', color: 'var(--text-secondary)', credits: 30 },
  pro: { label: 'Pro', color: 'var(--accent)', credits: 100 },
  creator_max: {
    label: 'Creator Max',
    color: 'var(--success)',
    credits: 300,
  },
}

interface UserData {
  id: string
  email: string
  name: string | null
  image: string | null
  plan: Plan
  credits: number
  creditsUsed: number
  creditsReset: string | null
  defaultNiche: string | null
  defaultVoiceId: string | null
  defaultStyle: string | null
  defaultFormat: string | null
  channelName: string | null
  notifyVideoReady: boolean
  notifyVideoPosted: boolean
  notifyMilestone: boolean
  notifyWeeklyReport: boolean
  notifyTrendAlert: boolean
  notifyCreditLow: boolean
  createdAt: string
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const sessionUser = session?.user
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Editable fields
  const [channelName, setChannelName] = useState('')
  const [defaultNiche, setDefaultNiche] = useState('')
  const [defaultVoiceId, setDefaultVoiceId] = useState('')
  const [defaultStyle, setDefaultStyle] = useState('')
  const [defaultFormat, setDefaultFormat] = useState<VideoFormat>('60s')
  const [notifyVideoReady, setNotifyVideoReady] = useState(true)
  const [notifyVideoPosted, setNotifyVideoPosted] = useState(true)
  const [notifyMilestone, setNotifyMilestone] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [notifyTrendAlert, setNotifyTrendAlert] = useState(true)
  const [notifyCreditLow, setNotifyCreditLow] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user')
        const data = await res.json()
        if (data.success && data.data) {
          const u = data.data as UserData
          setUser(u)
          setChannelName(u.channelName || '')
          setDefaultNiche(u.defaultNiche || '')
          setDefaultVoiceId(u.defaultVoiceId || '')
          setDefaultStyle(u.defaultStyle || '')
          setDefaultFormat((u.defaultFormat as VideoFormat) || '60s')
          setNotifyVideoReady(u.notifyVideoReady)
          setNotifyVideoPosted(u.notifyVideoPosted)
          setNotifyMilestone(u.notifyMilestone)
          setNotifyWeeklyReport(u.notifyWeeklyReport)
          setNotifyTrendAlert(u.notifyTrendAlert)
          setNotifyCreditLow(u.notifyCreditLow)
        }
      } catch {
        toast({ message: 'Failed to load settings', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [toast])

  // Check URL params for tab selection (from billing portal return)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [])

  const saveSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true)
      try {
        const res = await fetch('/api/user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = await res.json()
        if (data.success) {
          toast({ message: 'Settings saved!', type: 'success' })
        } else {
          toast({
            message: data.error || 'Failed to save',
            type: 'error',
          })
        }
      } catch {
        toast({ message: 'Network error', type: 'error' })
      } finally {
        setSaving(false)
      }
    },
    [toast]
  )

  const handleSaveProfile = () => {
    saveSettings({ channelName })
  }

  const handleSaveDefaults = () => {
    saveSettings({
      defaultNiche,
      defaultVoiceId,
      defaultStyle,
      defaultFormat,
    })
  }

  const handleSaveNotifications = () => {
    saveSettings({
      notifyVideoReady,
      notifyVideoPosted,
      notifyMilestone,
      notifyWeeklyReport,
      notifyTrendAlert,
      notifyCreditLow,
    })
  }

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/payments/portal', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.portalUrl) {
        window.open(data.data.portalUrl, '_blank')
      } else {
        toast({
          message: data.error || 'Failed to open billing portal',
          type: 'error',
        })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    }
  }

  const handleUpgradePlan = async (planId: string) => {
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', planId }),
      })
      const data = await res.json()
      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      } else {
        toast({
          message: data.error || 'Failed to start checkout',
          type: 'error',
        })
      }
    } catch {
      toast({ message: 'Network error', type: 'error' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="px-8 py-7 max-w-[800px]">
        <Skeleton width={200} height={28} rounded="md" />
        <div className="mt-6 space-y-4">
          <Skeleton width="100%" height={200} rounded="lg" />
          <Skeleton width="100%" height={200} rounded="lg" />
        </div>
      </div>
    )
  }

  const plan = user?.plan ?? 'free'
  const planInfo = PLAN_INFO[plan]
  const creditPercentage = user
    ? Math.round((user.creditsUsed / user.credits) * 100)
    : 0
  const daysUntilReset = user?.creditsReset
    ? Math.max(
      0,
      Math.ceil(
        (new Date(user.creditsReset).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
      )
    )
    : 0

  return (
    <div className="px-8 py-7 max-w-[800px]">
      <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-5">
        Settings
      </h1>

      <Tabs
        items={TABS}
        active={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      <div className="mt-5">
        {/* ── PROFILE TAB ─────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <Card padding="md">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <User size={16} /> Profile
              </h3>

              {/* Avatar + email */}
              <div className="flex items-center gap-4 mb-5">
                <Avatar
                  src={user?.image || sessionUser?.image || undefined}
                  name={user?.name || sessionUser?.name || 'User'}
                  size="xl"
                />
                <div>
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {user?.name || sessionUser?.name || 'User'}
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    {user?.email || sessionUser?.email}
                  </p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                    Signed in securely
                  </p>
                </div>
              </div>

              {/* Channel name */}
              <Input
                label="Channel Name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                helperText="Used in auto-generated captions"
              />

              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveProfile} loading={saving}>
                  Save Profile
                </Button>
              </div>
            </Card>

            {/* Danger zone */}
            <Card padding="md">
              <h3 className="text-[14px] font-semibold text-[var(--danger)] mb-2 flex items-center gap-2">
                <Shield size={16} /> Danger Zone
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                Permanently delete your account and all associated data.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Account
              </Button>
            </Card>
          </div>
        )}

        {/* ── SUBSCRIPTION TAB ────────────────── */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <Card padding="md">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <CreditCard size={16} /> Current Plan
              </h3>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-[8px] flex items-center justify-center"
                  style={{ backgroundColor: `${planInfo.color}15` }}
                >
                  <Crown
                    size={18}
                    style={{ color: planInfo.color }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-[var(--text-primary)]">
                      {planInfo.label}
                    </span>
                    <Badge
                      variant={
                        plan === 'creator_max'
                          ? 'success'
                          : plan === 'pro'
                            ? 'accent'
                            : 'dim'
                      }
                      size="sm"
                    >
                      Active
                    </Badge>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    {user?.credits ?? planInfo.credits} credits / month
                  </p>
                </div>
              </div>

              {/* Credit usage */}
              <div className="p-4 rounded-[10px] bg-[var(--surface-hover)] mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    Credit Usage
                  </span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] tabular-nums">
                    {user?.creditsUsed ?? 0} / {user?.credits ?? planInfo.credits}
                  </span>
                </div>
                <Progress
                  value={creditPercentage}
                  size="md"
                  color={
                    creditPercentage >= 90
                      ? 'danger'
                      : creditPercentage >= 70
                        ? 'warning'
                        : 'accent'
                  }
                />
                <p className="text-[11px] text-[var(--text-dim)] mt-2">
                  Resets in {daysUntilReset} days
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={handleManageBilling}
                leftIcon={<ExternalLink size={14} />}
              >
                Manage Billing
              </Button>
            </Card>

            {/* Plan comparison */}
            <Card padding="md">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
                Available Plans
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(
                  Object.entries(PLAN_INFO) as [
                    Plan,
                    (typeof PLAN_INFO)[Plan],
                  ][]
                )
                .filter(([planId]) => planId !== 'free')
                .map(([planId, info]) => (
                  <div
                    key={planId}
                    className={cn(
                      'p-4 rounded-[10px] border text-center transition-all',
                      plan === planId
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border)]'
                    )}
                  >
                    <Crown
                      size={20}
                      style={{ color: info.color }}
                      className="mx-auto mb-2"
                    />
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {info.label}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                      {info.credits} credits/mo
                    </p>
                    {plan === planId ? (
                      <Badge variant="accent" size="sm" className="mt-2">
                        Current
                      </Badge>
                    ) : (
                      <div className="mt-3">
                        <Button
                          variant={plan === 'free' ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full"
                          loading={checkoutLoading === planId}
                          disabled={checkoutLoading !== null}
                          onClick={() => handleUpgradePlan(planId)}
                        >
                          Upgrade
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── DEFAULTS TAB ────────────────────── */}
        {activeTab === 'defaults' && (
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Sliders size={16} /> Default Preferences
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] mb-5">
              Pre-fill the create wizard with your defaults
            </p>

            <div className="space-y-4">
              {/* Default niche */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Default Niche
                </label>
                <Dropdown
                  align="left"
                  trigger={
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                      {NICHES.find((n) => n.id === defaultNiche)
                        ? `${NICHES.find((n) => n.id === defaultNiche)?.emoji} ${NICHES.find((n) => n.id === defaultNiche)?.label}`
                        : 'Select niche'}
                    </button>
                  }
                  items={NICHES.map((n) => ({
                    label: `${n.emoji} ${n.label}`,
                    onClick: () => setDefaultNiche(n.id),
                  }))}
                />
              </div>

              {/* Default format */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Default Format
                </label>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDefaultFormat(opt.id)}
                      className={cn(
                        'px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer',
                        defaultFormat === opt.id
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default voice */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Default Voice
                </label>
                <Dropdown
                  align="left"
                  trigger={
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer capitalize">
                      {VOICES.find((v) => v.id === defaultVoiceId)?.name ||
                        'Select voice'}
                    </button>
                  }
                  items={VOICES.map((v) => ({
                    label: `${v.name} (${v.accent})`,
                    onClick: () => setDefaultVoiceId(v.id),
                  }))}
                />
              </div>

              {/* Default style */}
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Default Image Style
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {IMAGE_STYLES.slice(0, 8).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setDefaultStyle(style.id)}
                      className={cn(
                        'p-2 rounded-[8px] text-center text-[11px] font-medium transition-all cursor-pointer',
                        defaultStyle === style.id
                          ? 'bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                      )}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <Button onClick={handleSaveDefaults} loading={saving}>
                Save Defaults
              </Button>
            </div>
          </Card>
        )}

        {/* ── NOTIFICATIONS TAB ───────────────── */}
        {activeTab === 'notifications' && (
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Bell size={16} /> Email Notifications
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] mb-5">
              Choose which email notifications you receive
            </p>

            <div className="space-y-4">
              <NotifRow
                label="Video Ready"
                description="When your video finishes generating"
                checked={notifyVideoReady}
                onChange={setNotifyVideoReady}
              />
              <NotifRow
                label="Video Posted"
                description="When a video is published to a platform"
                checked={notifyVideoPosted}
                onChange={setNotifyVideoPosted}
              />
              <NotifRow
                label="Milestones"
                description="When you hit follower or view milestones"
                checked={notifyMilestone}
                onChange={setNotifyMilestone}
              />
              <NotifRow
                label="Weekly Report"
                description="Weekly summary of your analytics"
                checked={notifyWeeklyReport}
                onChange={setNotifyWeeklyReport}
              />
              <NotifRow
                label="Trend Alerts"
                description="When a topic in your niche is trending"
                checked={notifyTrendAlert}
                onChange={setNotifyTrendAlert}
              />
              <NotifRow
                label="Low Credits"
                description="When your credits drop below 20%"
                checked={notifyCreditLow}
                onChange={setNotifyCreditLow}
              />
            </div>

            <div className="flex justify-end mt-5">
              <Button onClick={handleSaveNotifications} loading={saving}>
                Save Notifications
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Account Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                toast({
                  message:
                    'Account deletion requested. You will receive a confirmation email.',
                  type: 'info',
                })
                setDeleteModalOpen(false)
              }}
            >
              Delete My Account
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[14px] text-[var(--text-primary)]">
            Are you sure you want to delete your account? This action is{' '}
            <strong>permanent</strong> and cannot be undone.
          </p>
          <div className="p-3 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
            <p className="text-[12px] text-[var(--danger)]">
              All your videos, analytics data, platform connections, and autopilot
              settings will be permanently deleted.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ── Notification Toggle Row ──────────────────────────── */

function NotifRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
      <div>
        <p className="text-[13px] font-medium text-[var(--text-primary)]">
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} size="md" />
    </div>
  )
}
