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
    <div className="w-full max-w-4xl mx-auto">
      <div className="w-full">
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
                'flex gap-3 items-start bg-[var(--bg-card)] border rounded-[10px] p-4 cursor-pointer transition-colors relative',
                selectedIndex === index
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                  : 'border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              {/* Segment number badge */}
              <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center text-[11px] font-bold mt-1">
                {index + 1}
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
    </div>
  )
}

export { StepScript }
