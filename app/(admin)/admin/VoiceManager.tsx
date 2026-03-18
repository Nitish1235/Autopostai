'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mic, Upload, X, RefreshCw, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { VOICES } from '@/lib/utils/constants'

interface VoicePreview {
    id: string
    voiceId: string
    audioUrl: string
    active: boolean
}

interface GenerateResult {
    total: number
    generated: number
    failed: number
    results: Array<{ voiceId: string; name: string; status: 'ok' | 'error'; error?: string }>
}

// ── Upload helper ────────────────────────────────────
async function uploadFile(file: File, folder: string): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    return data.success ? data.data.url : null
}

export function VoiceManager() {
    const [previews, setPreviews] = useState<VoicePreview[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)
    const [generating, setGenerating] = useState(false)
    const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null)

    const fetchPreviews = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/voices')
        const data = await res.json()
        if (data.success) setPreviews(data.data)
        setLoading(false)
    }, [])

    useEffect(() => { fetchPreviews() }, [fetchPreviews])

    const handleBulkGenerate = async () => {
        if (!confirm(`This will generate TTS preview audio for all ${VOICES.length} voices using the default dialogue. It may take 2-3 minutes. Proceed?`)) return

        setGenerating(true)
        setGenerateResult(null)

        try {
            const res = await fetch('/api/admin/voices/generate', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setGenerateResult(data.data)
                await fetchPreviews()
            } else {
                alert('Generation failed: ' + (data.error || 'Unknown error'))
            }
        } catch {
            alert('Network error during bulk generation.')
        } finally {
            setGenerating(false)
        }
    }

    const handleUpload = async (voiceId: string, file: File) => {
        setUploading(voiceId)
        const audioUrl = await uploadFile(file, `voice-previews/${voiceId}`)
        if (!audioUrl) { setUploading(null); return }
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

    const voicesByLanguage = VOICES.reduce((acc, voice) => {
        if (!acc[voice.language]) acc[voice.language] = []
        acc[voice.language].push(voice)
        return acc
    }, {} as Record<string, typeof VOICES>)

    const totalWithPreviews = previews.filter((p) => p.active).length

    return (
        <div>
            {/* Info banner */}
            <div className="mb-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" /><line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" /><line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" />
                    </svg>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-blue-300">Voice Preview Audio Clips</p>
                        <p className="text-xs text-[#888] leading-relaxed">
                            Pre-generate TTS audio for all voices using the default dialogue so users can preview them in the Creation Wizard without hitting the API each time.
                        </p>
                    </div>
                </div>
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Mic size={18} className="text-violet-400" />
                        Voice Previews
                        <span className="text-xs font-normal text-[#666] ml-1">
                            {totalWithPreviews}/{VOICES.length} voices ready
                        </span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchPreviews}
                        className="p-2.5 rounded-lg bg-[#12121a] border border-[#1e1e2e] text-[#888] hover:text-white transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {/* Bulk generate button */}
                    <button
                        onClick={handleBulkGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                        {generating ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating... (~2 min)
                            </>
                        ) : (
                            <>
                                <Zap size={14} />
                                Auto-Generate All Voices
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Generation result summary */}
            {generateResult && (
                <div className={`mb-5 p-4 rounded-xl border text-sm ${generateResult.failed === 0
                    ? 'bg-green-500/5 border-green-500/20 text-green-300'
                    : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
                    }`}>
                    <div className="flex items-center gap-2 font-semibold mb-2">
                        {generateResult.failed === 0
                            ? <CheckCircle size={15} />
                            : <AlertCircle size={15} />
                        }
                        Generation complete: {generateResult.generated}/{generateResult.total} voices generated
                        {generateResult.failed > 0 && ` (${generateResult.failed} failed)`}
                    </div>
                    {generateResult.failed > 0 && (
                        <div className="text-xs text-yellow-400/70 space-y-0.5 mt-2">
                            {generateResult.results
                                .filter((r) => r.status === 'error')
                                .map((r) => (
                                    <div key={r.voiceId}>✗ {r.name}: {r.error}</div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Progress bar when generating */}
            {generating && (
                <div className="mb-5 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                    <p className="text-xs text-violet-300 mb-2">Generating voice previews — running 3 at a time to avoid rate limits...</p>
                    <div className="w-full h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full animate-pulse w-full" />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(voicesByLanguage).map(([lang, vArr]) => (
                        <div key={lang}>
                            <h3 className="text-sm font-semibold text-[#aaa] mb-4 pb-2 border-b border-[#1e1e2e] flex items-center gap-2">
                                {lang}
                                <span className="text-[10px] font-normal text-[#555]">
                                    {previews.filter((p) => vArr.some((v) => v.id === p.voiceId)).length}/{vArr.length} ready
                                </span>
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
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-semibold text-white">{voice.name}</p>
                                                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${voice.gender === 'Female' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {voice.gender}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#666]">{voice.accent} · {voice.tags.slice(0, 2).join(', ')}</p>
                                                <div className="mt-2 text-xs">
                                                    {preview ? (
                                                        <span className="text-green-400 font-medium">✓ Preview ready</span>
                                                    ) : (
                                                        <span className="text-red-400/70">✗ No preview</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="flex-1 flex items-center justify-center gap-2 h-8 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-xs text-[#888] cursor-pointer hover:border-violet-500/30 transition-colors">
                                                    {isUploading ? (
                                                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload size={11} />
                                                            {preview ? 'Replace' : 'Upload MP3'}
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
                                                        className="p-2 h-8 rounded-lg border border-[#1e1e2e] text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        title="Delete preview"
                                                    >
                                                        <X size={12} />
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
