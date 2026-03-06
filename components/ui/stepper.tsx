'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-300',
                  isCompleted && 'bg-[var(--accent)] text-white',
                  isCurrent &&
                    'border-2 border-[var(--accent)] text-[var(--accent)]',
                  isUpcoming &&
                    'border-2 border-[var(--border)] text-[var(--text-dim)]'
                )}
              >
                {isCompleted ? <Check size={14} /> : index + 1}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-[11px] mt-1.5 whitespace-nowrap',
                  isUpcoming
                    ? 'text-[var(--text-dim)]'
                    : 'text-[var(--text-primary)]'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 mt-[-18px] bg-[var(--border)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--accent)]"
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { Stepper }
export type { StepperProps }
