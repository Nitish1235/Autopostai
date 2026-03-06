'use client'

import { useState, useEffect, useCallback } from 'react'
import { VoiceManager } from './VoiceManager'
import {
    Video,
    Music,
    Palette,
    Mic,
    Plus,
    Trash2,
    Upload,
    X,
    Film,
    FileAudio,
    Image as ImageIcon,
    RefreshCw,
    Info,
    Layers,
    GalleryHorizontalEnd,
    LayoutGrid,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────

interface ShowcaseVideo {
    id: string
    title: string
    niche: string
    views: string
    likes: string
    videoUrl: string | null
    thumbnailUrl: string | null
    gradient: string
    order: number
    active: boolean
}

interface MusicTrack {
    id: string
    name: string
    mood: string
    fileUrl: string
    duration: number | null
    active: boolean
}

interface StylePreview {
    id: string
    styleId: string
    imageUrl: string
    active: boolean
}

const MOODS = ['upbeat', 'dark', 'motivational', 'calm', 'mystery']
const STYLES = [
    'cinematic',
    'anime',
    'dark_fantasy',
    'cyberpunk',
    'documentary',
    'vintage',
    '3d_render',
    'minimal',
]
const GRADIENTS = [
    'from-emerald-600/50 to-teal-800/50',
    'from-blue-600/50 to-indigo-800/50',
    'from-orange-600/50 to-red-800/50',
    'from-violet-600/50 to-purple-800/50',
    'from-cyan-600/50 to-blue-800/50',
    'from-pink-600/50 to-rose-800/50',
    'from-amber-600/50 to-yellow-800/50',
    'from-lime-600/50 to-green-800/50',
]

// ── Upload helper ────────────────────────────────────

async function uploadFile(
    file: File,
    folder: string
): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
    })
    const data = await res.json()
    return data.success ? data.data.url : null
}

// ── Main Admin Page ──────────────────────────────────

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'videos' | 'music' | 'styles' | 'voices'>(
        'videos'
    )

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-[#888] mt-1">
                    Manage showcase videos, music library, image style previews, and voice previews
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[#12121a] rounded-xl border border-[#1e1e2e] mb-8 w-fit">
                {[
                    { id: 'videos' as const, label: 'Showcase Videos', icon: Video },
                    { id: 'music' as const, label: 'Music Library', icon: Music },
                    { id: 'styles' as const, label: 'Image Styles', icon: Palette },
                    { id: 'voices' as const, label: 'Voice Previews', icon: Mic },
                ].map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${activeTab === tab.id
                                ? 'bg-violet-500/15 text-violet-400 shadow-sm'
                                : 'text-[#888] hover:text-white'
                                }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            {activeTab === 'videos' && <VideoManager />}
            {activeTab === 'music' && <MusicManager />}
            {activeTab === 'styles' && <StyleManager />}
            {activeTab === 'voices' && <VoiceManager />}
        </div>
    )
}

// ── Reusable Section Info Banner ─────────────────────

function SectionInfo({ title, location, format, description }: {
    title: string
    location: string
    format: string
    description: string
}) {
    return (
        <div className="mb-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-blue-300">{title}</p>
                    <p className="text-xs text-[#888] leading-relaxed">{description}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#666] bg-[#12121a] px-2.5 py-1 rounded-md">
                            📍 Shows on: <span className="text-white font-medium">{location}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#666] bg-[#12121a] px-2.5 py-1 rounded-md">
                            📎 Format: <span className="text-white font-medium">{format}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════
// VIDEO MANAGER (3 landing page sections)
// ══════════════════════════════════════════════════════

function VideoManager() {
    const [videos, setVideos] = useState<ShowcaseVideo[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        niche: '',
        views: '0',
        likes: '0',
        gradient: GRADIENTS[0],
    })
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [thumbFile, setThumbFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const fetchVideos = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/videos')
        const data = await res.json()
        if (data.success) setVideos(data.data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchVideos()
    }, [fetchVideos])

    const handleAdd = async () => {
        if (!formData.title || !formData.niche) return
        setUploading(true)

        let videoUrl: string | null = null
        let thumbnailUrl: string | null = null

        if (videoFile) {
            videoUrl = await uploadFile(videoFile, 'showcase-videos')
        }
        if (thumbFile) {
            thumbnailUrl = await uploadFile(thumbFile, 'showcase-thumbnails')
        }

        await fetch('/api/admin/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                videoUrl,
                thumbnailUrl,
            }),
        })

        setFormData({ title: '', niche: '', views: '0', likes: '0', gradient: GRADIENTS[0] })
        setVideoFile(null)
        setThumbFile(null)
        setShowForm(false)
        setUploading(false)
        fetchVideos()
    }

    const handleDelete = async (id: string) => {
        await fetch('/api/admin/videos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        fetchVideos()
    }

    return (
        <div className="space-y-10">
            {/* ── OVERVIEW BANNER ─────────────────────────── */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/5 to-blue-500/5 border border-violet-500/15">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                    <Film size={18} className="text-violet-400" />
                    Landing Page Videos
                </h2>
                <p className="text-xs text-[#888] leading-relaxed mb-4">
                    Your landing page has <strong className="text-white">3 distinct video showcase sections</strong>.
                    Each section displays videos differently. Upload content tailored to each section below.
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e]">
                        <Layers size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-white">① Showcase Carousel</p>
                            <p className="text-[10px] text-[#666] mt-0.5">&quot;Real results from real creators&quot; — swipeable cards with stats</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e]">
                        <GalleryHorizontalEnd size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-white">② Infinite Video Strip</p>
                            <p className="text-[10px] text-[#666] mt-0.5">Auto-scrolling rows of thumbnails below the hero</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e]">
                        <LayoutGrid size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-white">③ Video Grid</p>
                            <p className="text-[10px] text-[#666] mt-0.5">&quot;See what creators are building&quot; — 6-column grid with hover</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 1: SHOWCASE CAROUSEL ────────────── */}
            <div>
                <SectionInfo
                    title="① Showcase Carousel — &quot;Real results from real creators&quot;"
                    location="Landing Page → Below Features Section"
                    format="9:16 portrait thumbnail (.jpg/.png) + optional .mp4 video"
                    description="These appear as swipeable phone-mockup cards with title, niche, view count, and like count. Upload a thumbnail image and optionally a video. Users can navigate with arrows."
                />

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Layers size={14} className="text-emerald-400" />
                        Showcase Carousel Videos
                        <span className="text-[10px] text-[#555] font-normal ml-1">({videos.length} uploaded)</span>
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchVideos}
                            className="p-2 rounded-lg bg-[#12121a] border border-[#1e1e2e] text-[#888] hover:text-white transition-colors cursor-pointer"
                        >
                            <RefreshCw size={13} />
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500 transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            Add Video
                        </button>
                    </div>
                </div>

                {/* Add form */}
                {showForm && (
                    <div className="mb-6 p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-[#888] mb-1">Title *</label>
                                <input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                                    placeholder="e.g. How Einstein Changed Physics Forever"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[#888] mb-1">Niche *</label>
                                <input
                                    value={formData.niche}
                                    onChange={(e) =>
                                        setFormData({ ...formData, niche: e.target.value })
                                    }
                                    className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                                    placeholder="e.g. Finance, Technology, History"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[#888] mb-1">Views (display text)</label>
                                <input
                                    value={formData.views}
                                    onChange={(e) =>
                                        setFormData({ ...formData, views: e.target.value })
                                    }
                                    className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                                    placeholder="e.g. 2.4M"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[#888] mb-1">Likes (display text)</label>
                                <input
                                    value={formData.likes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, likes: e.target.value })
                                    }
                                    className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                                    placeholder="e.g. 180K"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-[#888] mb-1">
                                    Video File (.mp4) — optional
                                </label>
                                <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#0d0d14] border border-dashed border-[#1e1e2e] text-[#666] text-sm cursor-pointer hover:border-violet-500/30 transition-colors">
                                    <Upload size={14} />
                                    {videoFile ? videoFile.name : 'Choose file...'}
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs text-[#888] mb-1">
                                    Thumbnail (.jpg/.png) — 9:16 portrait
                                </label>
                                <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#0d0d14] border border-dashed border-[#1e1e2e] text-[#666] text-sm cursor-pointer hover:border-violet-500/30 transition-colors">
                                    <Upload size={14} />
                                    {thumbFile ? thumbFile.name : 'Choose file...'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Gradient picker */}
                        <div className="mb-4">
                            <label className="block text-xs text-[#888] mb-1.5">
                                Gradient (fallback if no thumbnail)
                            </label>
                            <div className="flex gap-2">
                                {GRADIENTS.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, gradient: g })}
                                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} ${formData.gradient === g
                                            ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-[#12121a]'
                                            : ''
                                            } cursor-pointer transition-all`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleAdd}
                                disabled={uploading || !formData.title || !formData.niche}
                                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-40 cursor-pointer transition-colors"
                            >
                                {uploading ? 'Uploading...' : 'Save Video'}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-[#888] text-sm hover:text-white cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Video list */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-8 text-[#555] text-sm bg-[#12121a] rounded-xl border border-dashed border-[#1e1e2e]">
                        No showcase videos yet. Click &quot;Add Video&quot; to get started.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {videos.map((v, i) => (
                            <div
                                key={v.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#2a2a3e] transition-colors"
                            >
                                <div
                                    className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br ${v.gradient}`}
                                >
                                    {v.thumbnailUrl && (
                                        <img
                                            src={v.thumbnailUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {v.title}
                                    </p>
                                    <p className="text-xs text-[#666] mt-0.5">
                                        {v.niche} · {v.views} views · {v.likes} likes
                                    </p>
                                </div>

                                <span className="text-[10px] text-[#555] font-mono">
                                    #{i + 1}
                                </span>

                                <button
                                    onClick={() => handleDelete(v.id)}
                                    className="p-2 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── SECTION 2: INFINITE VIDEO STRIP ─────────── */}
            <div>
                <SectionInfo
                    title="② Infinite Video Strip — Auto-scrolling showcase"
                    location="Landing Page → Below Hero Section"
                    format="9:16 portrait thumbnails (.jpg/.png), ~140px wide cards"
                    description="Two auto-scrolling rows of small video thumbnails. Currently uses hardcoded gradients with text labels. Upload thumbnail images here to replace them with real video previews. These scroll infinitely in opposite directions."
                />
                <div className="p-6 rounded-xl bg-[#12121a] border border-dashed border-[#1e1e2e] text-center">
                    <GalleryHorizontalEnd size={24} className="text-blue-400/40 mx-auto mb-2" />
                    <p className="text-sm text-[#666]">
                        The Infinite Video Strip currently uses hardcoded data.
                    </p>
                    <p className="text-xs text-[#444] mt-1">
                        To make it dynamic, the same videos from the Showcase Carousel above <br />
                        can be reused here. Upload enough carousel videos and they will populate both sections.
                    </p>
                </div>
            </div>

            {/* ── SECTION 3: VIDEO GRID ───────────────────── */}
            <div>
                <SectionInfo
                    title="③ Video Grid — &quot;See what creators are building&quot;"
                    location="Landing Page → Below Showcase Carousel"
                    format="9:16 portrait thumbnails (.jpg/.png), shown in a 6-column grid"
                    description="A 6-video grid displaying titles and niches. Currently uses hardcoded data with gradient placeholders. Upload thumbnail images to replace them. These display a hover play button and bottom-overlay niche/title labels."
                />
                <div className="p-6 rounded-xl bg-[#12121a] border border-dashed border-[#1e1e2e] text-center">
                    <LayoutGrid size={24} className="text-orange-400/40 mx-auto mb-2" />
                    <p className="text-sm text-[#666]">
                        The Video Grid currently uses hardcoded sample data.
                    </p>
                    <p className="text-xs text-[#444] mt-1">
                        Upload enough Showcase Carousel videos above and they will auto-populate here as well.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════
// MUSIC MANAGER
// ══════════════════════════════════════════════════════

function MusicManager() {
    const [tracks, setTracks] = useState<MusicTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({ name: '', mood: 'upbeat' })
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const fetchTracks = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/music')
        const data = await res.json()
        if (data.success) setTracks(data.data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchTracks()
    }, [fetchTracks])

    const handleAdd = async () => {
        if (!formData.name || !audioFile) return
        setUploading(true)

        const fileUrl = await uploadFile(audioFile, `music/${formData.mood}`)
        if (!fileUrl) {
            setUploading(false)
            return
        }

        await fetch('/api/admin/music', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, fileUrl }),
        })

        setFormData({ name: '', mood: 'upbeat' })
        setAudioFile(null)
        setShowForm(false)
        setUploading(false)
        fetchTracks()
    }

    const handleDelete = async (id: string) => {
        await fetch('/api/admin/music', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        fetchTracks()
    }

    // Group by mood
    const grouped = MOODS.reduce(
        (acc, mood) => {
            acc[mood] = tracks.filter((t) => t.mood === mood)
            return acc
        },
        {} as Record<string, MusicTrack[]>
    )

    return (
        <div>
            <SectionInfo
                title="Background Music Library"
                location="Dashboard → Create Video → Music Selection Step"
                format=".mp3 audio files, categorized by mood (upbeat, dark, motivational, calm, mystery)"
                description="Users pick a background music mood when creating videos. Upload one or more tracks per mood. The system randomly selects a track from the chosen mood category during video rendering."
            />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileAudio size={18} className="text-violet-400" />
                        Music Library
                    </h2>
                    <p className="text-xs text-[#666] mt-0.5">
                        Background music tracks users can select when creating videos
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTracks}
                        className="p-2.5 rounded-lg bg-[#12121a] border border-[#1e1e2e] text-[#888] hover:text-white transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-[13px] font-medium hover:bg-violet-500 transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        Add Track
                    </button>
                </div>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="mb-6 p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-[#888] mb-1">
                                Track Name *
                            </label>
                            <input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                                placeholder="e.g. energetic-01"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[#888] mb-1">Mood *</label>
                            <select
                                value={formData.mood}
                                onChange={(e) =>
                                    setFormData({ ...formData, mood: e.target.value })
                                }
                                className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none cursor-pointer"
                            >
                                {MOODS.map((m) => (
                                    <option key={m} value={m}>
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-[#888] mb-1">
                                Audio File (.mp3) *
                            </label>
                            <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#0d0d14] border border-dashed border-[#1e1e2e] text-[#666] text-sm cursor-pointer hover:border-violet-500/30 transition-colors">
                                <Upload size={14} />
                                {audioFile ? audioFile.name : 'Choose file...'}
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleAdd}
                            disabled={uploading || !formData.name || !audioFile}
                            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-40 cursor-pointer transition-colors"
                        >
                            {uploading ? 'Uploading...' : 'Save Track'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-[#888] text-sm hover:text-white cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Grouped list */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {MOODS.map((mood) => {
                        const moodTracks = grouped[mood] ?? []
                        return (
                            <div key={mood}>
                                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
                                    {mood} ({moodTracks.length})
                                </h3>
                                {moodTracks.length === 0 ? (
                                    <p className="text-xs text-[#444] pl-2">No tracks</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {moodTracks.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-[#12121a] border border-[#1e1e2e] hover:border-[#2a2a3e] transition-colors"
                                            >
                                                <Music size={14} className="text-violet-400 flex-shrink-0" />
                                                <span className="flex-1 text-sm text-white truncate">
                                                    {t.name}
                                                </span>
                                                {t.duration && (
                                                    <span className="text-[10px] text-[#555]">
                                                        {Math.floor(t.duration / 60)}:
                                                        {String(t.duration % 60).padStart(2, '0')}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="p-1.5 rounded-md text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ══════════════════════════════════════════════════════
// STYLE MANAGER
// ══════════════════════════════════════════════════════

function StyleManager() {
    const [previews, setPreviews] = useState<StylePreview[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)

    const fetchPreviews = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/styles')
        const data = await res.json()
        if (data.success) setPreviews(data.data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchPreviews()
    }, [fetchPreviews])

    const handleUpload = async (styleId: string, file: File) => {
        setUploading(styleId)
        const imageUrl = await uploadFile(file, 'style-previews')
        if (!imageUrl) {
            setUploading(null)
            return
        }

        await fetch('/api/admin/styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleId, imageUrl }),
        })

        setUploading(null)
        fetchPreviews()
    }

    const handleDelete = async (id: string) => {
        await fetch('/api/admin/styles', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        fetchPreviews()
    }

    const STYLE_LABELS: Record<string, string> = {
        cinematic: 'Cinematic Film',
        anime: 'Anime / Illustrated',
        dark_fantasy: 'Dark Fantasy',
        cyberpunk: 'Cyberpunk',
        documentary: 'Documentary',
        vintage: 'Vintage Film',
        '3d_render': '3D Render',
        minimal: 'Minimal Clean',
    }

    const STYLE_COLORS: Record<string, string> = {
        cinematic: 'from-[#0D2137] to-[#C8762A]',
        anime: 'from-[#FFB3D9] to-[#B3D9FF]',
        dark_fantasy: 'from-[#0D0013] to-[#400060]',
        cyberpunk: 'from-[#000D1A] to-[#CC00FF]',
        documentary: 'from-[#2C2416] to-[#766655]',
        vintage: 'from-[#3D2B1F] to-[#D4A86A]',
        '3d_render': 'from-[#1A1A2E] to-[#0F3460]',
        minimal: 'from-[#E8E8E8] to-[#FFFFFF]',
    }

    return (
        <div>
            <SectionInfo
                title="AI Image Style Preview Images"
                location="Dashboard → Create Video → Style Selection Step"
                format="9:16 portrait images (.jpg/.png/.webp), one per style card"
                description="When users choose an image style (Cinematic, Anime, Cyberpunk, etc.), they see preview cards. Upload a sample AI-generated image for each style so users know what to expect. Without an upload, a gradient placeholder is shown."
            />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <ImageIcon size={18} className="text-violet-400" />
                        Image Style Previews
                    </h2>
                    <p className="text-xs text-[#666] mt-0.5">
                        Upload preview images for each AI image style shown in the creation wizard
                    </p>
                </div>
                <button
                    onClick={fetchPreviews}
                    className="p-2.5 rounded-lg bg-[#12121a] border border-[#1e1e2e] text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4">
                    {STYLES.map((styleId) => {
                        const preview = previews.find((p) => p.styleId === styleId)
                        const isUploading = uploading === styleId
                        return (
                            <div
                                key={styleId}
                                className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden"
                            >
                                {/* Preview area */}
                                <div
                                    className={`aspect-[9/16] relative bg-gradient-to-br ${STYLE_COLORS[styleId] ?? 'from-gray-700 to-gray-900'}`}
                                >
                                    {preview?.imageUrl && (
                                        <img
                                            src={preview.imageUrl}
                                            alt={styleId}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}

                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}

                                    {/* Upload overlay */}
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors cursor-pointer group">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white font-medium flex items-center gap-1.5">
                                            <Upload size={12} />
                                            {preview ? 'Replace' : 'Upload'}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (f) handleUpload(styleId, f)
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {/* Label */}
                                <div className="p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-white">
                                            {STYLE_LABELS[styleId]}
                                        </p>
                                        <p className="text-[10px] text-[#555] mt-0.5">
                                            {preview ? 'Custom preview' : 'Using gradient'}
                                        </p>
                                    </div>
                                    {preview && (
                                        <button
                                            onClick={() => handleDelete(preview.id)}
                                            className="p-1.5 rounded-md text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
