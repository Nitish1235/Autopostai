'use client'

import { Layers, Sparkles } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'
import { useAiVideoCredits } from '@/hooks/useAiVideoCredits'
import { cn } from '@/lib/utils/cn'
import type { GenerationMode } from '@/types'

interface StepModeProps {
    generationMode: GenerationMode
    onChange: (mode: GenerationMode) => void
}

function StepMode({ generationMode, onChange }: StepModeProps) {
    const { credits: regularCredits, isEmpty: regularEmpty } = useCredits()
    const {
        credits: aiCredits,
        isEmpty: aiEmpty,
        limit: aiLimit,
    } = useAiVideoCredits()

    return (
        <div className="max-w-[720px] mx-auto pt-10">
            <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
                How do you want to create your video?
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-8">
                AI-powered faceless video generation. Select to continue.
            </p>

            <div className="max-w-[400px] mx-auto">
                {/* Image Stack Card */}
                <button
                    type="button"
                    onClick={() => !regularEmpty && onChange('image_stack')}
                    className={cn(
                        'relative w-full rounded-[12px] border-2 p-5 text-left transition-all duration-200',
                        generationMode === 'image_stack'
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                            : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-border)]',
                        regularEmpty && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Layers size={28} className="text-[var(--accent)]" />
                        <div>
                            <span className="text-[16px] font-bold text-[var(--text-primary)]">
                                Faceless Video
                            </span>
                        </div>
                    </div>

                    <p className="text-[13px] text-[var(--text-secondary)] mb-4 leading-relaxed">
                        AI-generated images + voiceover + subtitles.
                        Full control over every frame, voice, and style.
                        Best for storytelling and educational content.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {['11–28 images', 'Custom voice', 'Full subtitles'].map((pill) => (
                            <span
                                key={pill}
                                className="text-[10px] font-medium px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
                            >
                                {pill}
                            </span>
                        ))}
                    </div>

                    <p className="text-[11px] text-[var(--text-dim)]">
                        Uses 1 video credit · <span className="font-semibold">{regularCredits} remaining</span>
                    </p>

                    {regularEmpty && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[var(--danger)]/10 border-t border-[var(--danger)]/25 rounded-b-[10px] px-3 py-2">
                            <span className="text-[11px] text-[var(--danger)] font-medium">
                                No video credits
                            </span>
                        </div>
                    )}
                </button>

                {/* AI Video Card — temporarily hidden while Sora 2 API is unavailable */}
            </div>
        </div>
    )
}

export { StepMode }
