import { useState, useEffect, useCallback } from 'react'
import { Mic, Upload, X, RefreshCw } from 'lucide-react'
import { VOICES } from '@/lib/utils/constants'

interface VoicePreview {
    id: string
    voiceId: string
    audioUrl: string
    active: boolean
}

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

export function VoiceManager() {
    const [previews, setPreviews] = useState<VoicePreview[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)

    const fetchPreviews = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/voices')
        const data = await res.json()
        if (data.success) setPreviews(data.data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchPreviews()
    }, [fetchPreviews])

    const handleUpload = async (voiceId: string, file: File) => {
        setUploading(voiceId)
        const audioUrl = await uploadFile(file, `voice-previews/${voiceId}`)
        if (!audioUrl) {
            setUploading(null)
            return
        }

        await fetch('/api/admin/voices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceId, audioUrl }),
        })

        setUploading(null)
        fetchPreviews()
    }

    const handleDelete = async (id: string) => {
        await fetch('/api/admin/voices', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        fetchPreviews()
    }

    // Group VOICES by language
    const voicesByLanguage = VOICES.reduce(
        (acc, voice) => {
            if (!acc[voice.language]) acc[voice.language] = []
            acc[voice.language].push(voice)
            return acc
        },
        {} as Record<string, typeof VOICES>
    )

    return (
        <div>
            {/* Section info banner */}
            <div className="mb-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" /><line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" /></svg>
                    <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-blue-300">Voice Preview Audio Clips</p>
                        <p className="text-xs text-[#888] leading-relaxed">
                            Record or generate a short audio clip for each voice (e.g. &quot;Hello, this is how I sound&quot;) and upload it here.
                            When users browse voices in the creation wizard, they&apos;ll hear your uploaded clip instead of hitting the UnrealSpeech API each time.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#666] bg-[#12121a] px-2.5 py-1 rounded-md">
                                📍 Shows on: <span className="text-white font-medium">Dashboard → Create Video → Voice Selection Step</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#666] bg-[#12121a] px-2.5 py-1 rounded-md">
                                📎 Format: <span className="text-white font-medium">.mp3 audio files, one per voice ID</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Mic size={18} className="text-violet-400" />
                        Voice Previews
                    </h2>
                    <p className="text-xs text-[#666] mt-0.5">
                        Upload default audio files for voice previews so you don't hit the UnrealSpeech API on every click
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
                <div className="space-y-8">
                    {Object.entries(voicesByLanguage).map(([lang, vArr]) => (
                        <div key={lang}>
                            <h3 className="text-sm font-semibold text-[#aaa] mb-4 pb-2 border-b border-[#1e1e2e]">
                                {lang} ({vArr.length})
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                {vArr.map((voice) => {
                                    const preview = previews.find((p) => p.voiceId === voice.id)
                                    const isUploading = uploading === voice.id

                                    return (
                                        <div
                                            key={voice.id}
                                            className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4 flex flex-col justify-between"
                                        >
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-semibold text-white">
                                                        {voice.name}
                                                    </p>
                                                    <span className="text-[10px] uppercase tracking-wider text-[#666] bg-[#1a1a2e] px-1.5 py-0.5 rounded">
                                                        {voice.gender}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#888]">{voice.tags.join(', ')}</p>

                                                <div className="mt-3 text-xs">
                                                    {preview ? (
                                                        <span className="text-green-400 font-medium">✓ Audio uploaded</span>
                                                    ) : (
                                                        <span className="text-red-400/80">✗ No preview audio</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-xs text-[#888] cursor-pointer hover:border-violet-500/30 transition-colors">
                                                    {isUploading ? (
                                                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload size={12} />
                                                            {preview ? 'Replace Audio' : 'Upload MP3'}
                                                        </>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="audio/*"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0]
                                                            if (f) handleUpload(voice.id, f)
                                                        }}
                                                        className="hidden"
                                                    />
                                                </label>

                                                {preview && (
                                                    <button
                                                        onClick={() => handleDelete(preview.id)}
                                                        className="p-2 h-9 rounded-lg border border-[#1e1e2e] text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        title="Delete preview"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
