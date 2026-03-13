'use client'

import { useState } from 'react'
import { RefreshCw, Trash2, Plus, ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type { ScriptSegment, ImageStyle } from '@/types'

const STYLE_GRADIENTS: Record<string, string> = {
  cinematic: 'linear-gradient(160deg, #0D2137, #1A4D6E, #C8762A)',
  anime: 'linear-gradient(160deg, #FFB3D9, #B3D9FF, #FFD9B3)',
  dark_fantasy: 'linear-gradient(160deg, #0D0013, #200033, #400060)',
  cyberpunk: 'linear-gradient(160deg, #000D1A, #001F3F, #CC00FF)',
  documentary: 'linear-gradient(160deg, #2C2416, #4A3E2E, #766655)',
  vintage: 'linear-gradient(160deg, #3D2B1F, #7A5C3A, #D4A86A)',
  '3d_render': 'linear-gradient(160deg, #1A1A2E, #16213E, #0F3460)',
  minimal: 'linear-gradient(160deg, #E8E8E8, #F5F5F5, #FFFFFF)',
}

interface StepScriptProps {
  script: ScriptSegment[]
  onScriptChange: (script: ScriptSegment[]) => void
  imageStyle: ImageStyle
  voiceId: string
}

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / 150) * 60)
}

function StepScript({
  script,
  onScriptChange,
  imageStyle,
  voiceId,
}: StepScriptProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const totalWords = script.reduce(
    (sum, s) => sum + s.narration.trim().split(/\s+/).filter(Boolean).length,
    0
  )
  const totalDuration = script.reduce(
    (sum, s) => sum + estimateDuration(s.narration),
    0
  )

  const gradient = STYLE_GRADIENTS[imageStyle] || STYLE_GRADIENTS.cinematic

  const handleNarrationChange = (index: number, narration: string) => {
    onScriptChange(script.map((seg, i) => (i === index ? { ...seg, narration } : seg)))
  }

  const handleDelete = (index: number) => {
    if (script.length <= 1) return
    const updated = script
      .filter((_, i) => i !== index)
      .map((seg, i) => ({ ...seg, order: i }))
    onScriptChange(updated)
    setSelectedIndex(Math.min(selectedIndex, updated.length - 1))
  }

  const handleAdd = () => {
    const newSeg: ScriptSegment = {
      id: `seg-${Date.now()}`,
      order: script.length,
      narration: '',
      imagePrompt: 'New scene',
    }
    onScriptChange([...script, newSeg])
  }

  const selectedSeg = script[selectedIndex]

  return (
    <div className="flex gap-5">
      {/* ── Left panel: segment list (55%) ── */}
      <div className="flex-[0_0_55%]">
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
          Review &amp; Edit Script
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-4">
          Click any segment to select · edit narration inline.
        </p>

        <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
          {script.map((segment, index) => (
            <div
              key={segment.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'flex gap-3 items-start bg-[var(--bg-card)] border rounded-[10px] p-3 cursor-pointer transition-colors',
                selectedIndex === index
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                  : 'border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              {/* Thumbnail */}
              <div
                className="shrink-0 w-[48px] h-[68px] rounded-[6px] overflow-hidden relative"
                style={{ background: gradient }}
              >
                {segment.imageUrl ? (
                  <img
                    src={segment.imageUrl}
                    alt={`Segment ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={14} className="text-white/40" />
                  </div>
                )}
                {/* Segment number badge */}
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[8px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--text-dim)] truncate mb-1">
                  {segment.imagePrompt}
                </p>
                <textarea
                  value={segment.narration}
                  onChange={(e) => handleNarrationChange(index, e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingIndex(index)
                    setSelectedIndex(index)
                  }}
                  onBlur={() => setEditingIndex(null)}
                  placeholder="Edit narration..."
                  className="w-full bg-transparent border-none text-[13px] text-[var(--text-primary)] leading-[1.6] resize-none focus:outline-none"
                  rows={Math.max(2, Math.ceil(segment.narration.length / 65))}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-dim)]">
                    ~{estimateDuration(segment.narration)}s ·{' '}
                    {segment.narration.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(index)
                    }}
                    disabled={script.length <= 1}
                    className="p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add segment */}
          <button
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-colors flex items-center justify-center gap-2 text-[13px] cursor-pointer"
          >
            <Plus size={15} /> Add segment
          </button>
        </div>
      </div>

      {/* ── Right panel: image preview (45%) ── */}
      <div className="flex-[0_0_45%]">
        <div className="sticky top-[80px] space-y-4">
          {/* Stats */}
          <Card padding="md">
            <h3 className="text-[12px] font-semibold text-[var(--text-primary)] mb-3">
              Script Stats
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Words', value: totalWords },
                { label: 'Duration', value: `~${totalDuration}s` },
                { label: 'Segments', value: script.length },
                { label: 'Images', value: script.filter((s) => s.imageUrl).length + '/' + script.length },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider">{label}</p>
                  <p className="text-[15px] font-bold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Selected image preview */}
          {selectedSeg && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Segment {selectedIndex + 1} Image
                </p>
                {!selectedSeg.imageUrl && (
                  <span className="text-[9px] text-[var(--text-dim)] border border-[var(--border)] rounded-full px-2 py-0.5">
                    Generated on render
                  </span>
                )}
              </div>

              {/* Main image display (9:16 aspect ratio) */}
              <div
                className="w-full rounded-[8px] overflow-hidden relative"
                style={{ aspectRatio: '9/16', maxHeight: '220px', background: gradient }}
              >
                {selectedSeg.imageUrl ? (
                  <img
                    src={selectedSeg.imageUrl}
                    alt={`Segment ${selectedIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                    <ImageIcon size={22} className="text-white/30" />
                    <p className="text-[10px] text-white/40 text-center leading-snug">
                      {selectedSeg.imagePrompt}
                    </p>
                  </div>
                )}
                {/* Number badge */}
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center backdrop-blur-sm">
                  {selectedIndex + 1}
                </span>
              </div>
            </Card>
          )}

          {/* Filmstrip — all segments */}
          {script.length > 0 && (
            <Card padding="md">
              <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
                All Scenes
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {script.map((seg, i) => (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      'shrink-0 relative rounded-[5px] overflow-hidden transition-all cursor-pointer',
                      selectedIndex === i
                        ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-primary)]'
                        : 'opacity-60 hover:opacity-90'
                    )}
                    style={{ width: 36, height: 52, background: gradient }}
                  >
                    {seg.imageUrl ? (
                      <img
                        src={seg.imageUrl}
                        alt={`Seg ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={10} className="text-white/30" />
                      </div>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] font-bold text-center py-px">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
              {script.every((s) => !s.imageUrl) && (
                <p className="text-[10px] text-[var(--text-dim)] mt-2 text-center">
                  Images generate automatically when you click "Generate Video" →
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export { StepScript }
