'use client'

import { useState } from 'react'
import { RefreshCw, Trash2, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { ScriptSegment } from '@/types'

interface StepScriptProps {
  script: ScriptSegment[]
  onScriptChange: (script: ScriptSegment[]) => void
  imageStyle: string
  voiceId: string
}

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.round((words / 150) * 60) // ~150 words/min
}

function StepScript({
  script,
  onScriptChange,
  imageStyle,
  voiceId,
}: StepScriptProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)

  const totalWords = script.reduce(
    (sum, s) => sum + s.narration.trim().split(/\s+/).length,
    0
  )
  const totalDuration = script.reduce(
    (sum, s) => sum + estimateDuration(s.narration),
    0
  )

  const handleNarrationChange = (index: number, narration: string) => {
    const updated = script.map((seg, i) =>
      i === index ? { ...seg, narration } : seg
    )
    onScriptChange(updated)
  }

  const handleDelete = (index: number) => {
    if (script.length <= 1) return
    const updated = script
      .filter((_, i) => i !== index)
      .map((seg, i) => ({ ...seg, order: i }))
    onScriptChange(updated)
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

  const handleRerollImage = async (index: number) => {
    setRegeneratingIndex(index)
    // Simulate regeneration delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setRegeneratingIndex(null)
  }

  return (
    <div className="flex gap-6">
      {/* Left panel (58%) */}
      <div className="flex-[0_0_58%]">
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
          Review & Edit Script
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">
          Click any segment to edit before generating.
        </p>

        <div className="space-y-3">
          {script.map((segment, index) => (
            <div
              key={segment.id}
              onClick={() => setEditingIndex(index)}
              className={cn(
                'bg-[var(--bg-card)] border rounded-10 p-4 cursor-pointer transition-colors',
                editingIndex === index
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--border)] hover:border-[var(--border-hover)]'
              )}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)] truncate max-w-[250px]">
                    {segment.imagePrompt}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRerollImage(index)
                  }}
                  disabled={regeneratingIndex === index}
                  className="p-1.5 rounded-md text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={cn(
                      regeneratingIndex === index && 'animate-spin'
                    )}
                  />
                </button>
              </div>

              {/* Narration */}
              <textarea
                value={segment.narration}
                onChange={(e) => handleNarrationChange(index, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Edit narration..."
                className="w-full bg-transparent border-none text-[14px] text-[var(--text-primary)] leading-[1.7] resize-none focus:outline-none min-h-[60px]"
                rows={Math.max(2, Math.ceil(segment.narration.length / 80))}
              />

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)]">
                  <span>~{estimateDuration(segment.narration)}s</span>
                  <span>
                    {segment.narration.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(index)
                  }}
                  disabled={script.length <= 1}
                  className="p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Add segment */}
          <button
            onClick={handleAdd}
            className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-10 text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-colors flex items-center justify-center gap-2 text-[13px] cursor-pointer"
          >
            <Plus size={16} /> Add segment
          </button>
        </div>
      </div>

      {/* Right panel (42%) */}
      <div className="flex-[0_0_42%]">
        <div className="sticky top-[80px] space-y-4">
          {/* Stats */}
          <Card padding="md">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
              Script Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Words
                </p>
                <p className="text-[18px] font-bold text-[var(--text-primary)]">
                  {totalWords}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Duration
                </p>
                <p className="text-[18px] font-bold text-[var(--text-primary)]">
                  ~{totalDuration}s
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Segments
                </p>
                <p className="text-[18px] font-bold text-[var(--text-primary)]">
                  {script.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Images
                </p>
                <p className="text-[18px] font-bold text-[var(--text-primary)]">
                  {script.length}
                </p>
              </div>
            </div>
          </Card>

          {/* Cost estimate */}
          <div className="bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-[9px] p-4">
            <p className="text-[12px] text-[var(--accent)] font-medium">
              Estimated cost
            </p>
            <p className="text-[16px] font-bold text-[var(--text-primary)] mt-1">
              ~${(script.length * 0.003).toFixed(3)} in API costs
            </p>
            <p className="text-[11px] text-[var(--text-dim)] mt-1">
              1 credit from your plan
            </p>
          </div>

          {/* Voice preview */}
          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Voice
                </p>
                <p className="text-[13px] font-medium text-[var(--text-primary)] capitalize">
                  {voiceId || 'Not selected'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                  Style
                </p>
                <p className="text-[13px] font-medium text-[var(--text-primary)] capitalize">
                  {imageStyle.replace('_', ' ')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { StepScript }
