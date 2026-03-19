'use client'

import { useState } from 'react'
import {
  Layers,
  Wand2,
  ListVideo,
  Settings,
  Image as ImageIcon,
  VolumeX,
  Volume2
} from 'lucide-react'

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

export function ShowcaseGenerator() {
  const [topicsText, setTopicsText] = useState('')
  const [generationMode, setGenerationMode] = useState<'image_stack' | 'ai_video'>('image_stack')
  const [skipAudio, setSkipAudio] = useState(false)
  const [imageStyle, setImageStyle] = useState('cinematic')
  const [niche, setNiche] = useState('General')
  const [section, setSection] = useState('carousel') // carousel | strip | grid
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleGenerate = async () => {
    setMessage(null)
    const topics = topicsText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    if (topics.length === 0) {
      setMessage({ type: 'error', text: 'Please enter at least one topic.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/showcase-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics,
          generationMode,
          skipAudio,
          imageStyle,
          niche,
          section
        })
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setTopicsText('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enqueue jobs' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/15">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <Wand2 size={18} className="text-emerald-400" />
          Showcase Autopilot Generator
        </h2>
        <p className="text-xs text-[#888] leading-relaxed mb-4">
          Bulk generate short 12-15s videos specifically for the landing page showcase. 
          The system will safely generate videos without attaching them to a user account, 
          and automatically push them to the public showcase strip when rendering finishes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ListVideo size={16} className="text-violet-400" />
              Topics List
            </h3>
            
            <label className="block text-xs text-[#888] mb-2">
              Enter one topic per line. The system will create a separate showcase video for each line.
            </label>
            <textarea
              className="w-full h-64 p-4 rounded-xl bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none resize-none leading-relaxed"
              placeholder="e.g.&#10;The history of artificial intelligence&#10;Top 5 remote work habits&#10;How quantum computers actually work"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={16} className="text-violet-400" />
              Generation Settings
            </h3>

            <div className="space-y-5">
              {/* Niche */}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Tag / Niche</label>
                <input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none"
                  placeholder="e.g. Technology"
                />
              </div>

              {/* Target Section */}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Target Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none cursor-pointer"
                >
                  <option value="carousel">Carousel (Desktop size)</option>
                  <option value="strip">Infinite Strip (Small cards)</option>
                  <option value="grid">Video Grid (6-column row)</option>
                </select>
              </div>

              {/* Engine */}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Engine</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGenerationMode('image_stack')}
                    className={`h-10 rounded-lg text-xs font-medium border transition-colors ${
                      generationMode === 'image_stack'
                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                        : 'bg-[#0d0d14] border-[#1e1e2e] text-[#666] hover:bg-[#1a1a2e]'
                    }`}
                  >
                    Image Stack
                  </button>
                  <button
                    onClick={() => setGenerationMode('ai_video')}
                    className={`h-10 rounded-lg text-xs font-medium border transition-colors ${
                      generationMode === 'ai_video'
                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                        : 'bg-[#0d0d14] border-[#1e1e2e] text-[#666] hover:bg-[#1a1a2e]'
                    }`}
                  >
                    Sora 2
                  </button>
                </div>
              </div>

              {/* Style (if image stack) */}
              {generationMode === 'image_stack' && (
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Image Style</label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm focus:border-violet-500/50 focus:outline-none cursor-pointer"
                  >
                    {STYLES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Audio Toggle */}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Voice Generation</label>
                <button
                  onClick={() => setSkipAudio(!skipAudio)}
                  className={`w-full h-10 px-4 rounded-lg flex items-center justify-between text-sm transition-colors border ${
                    skipAudio 
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {skipAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {skipAudio ? 'Skip Voice (Silent/Music)' : 'Generate Voiceover'}
                  </span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${skipAudio ? 'bg-orange-500/20' : 'bg-emerald-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full transition-transform ${skipAudio ? 'bg-orange-400 translate-x-0' : 'bg-emerald-400 translate-x-4'}`} />
                  </div>
                </button>
              </div>

              {/* Generate Button */}
              <div className="pt-4 border-t border-[#1e1e2e]">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Generate Batch
                    </>
                  )}
                </button>

                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                    message.type === 'error' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
