'use client'

import { forwardRef, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  autoResize?: boolean
  minHeight?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      autoResize = false,
      minHeight = 100,
      className,
      id,
      onInput,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLTextAreaElement>) => {
        if (autoResize) {
          const target = e.currentTarget
          target.style.height = 'auto'
          target.style.height = `${target.scrollHeight}px`
        }
        onInput?.(e)
      },
      [autoResize, onInput]
    )

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-medium text-[var(--text-secondary)] tracking-[0.3px]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          onInput={handleInput}
          style={{ minHeight: `${minHeight}px` }}
          className={cn(
            'w-full px-3 py-2.5 rounded-[8px] resize-none',
            'bg-[var(--bg-card)] border border-[var(--border)]',
            'text-[var(--text-primary)] text-[13px] leading-relaxed',
            'placeholder:text-[var(--text-dim)]',
            'transition-[border-color,box-shadow] duration-150',
            'focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-subtle)]',
            error &&
              'border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(255,69,58,0.15)]',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <span className="text-[11px] text-[var(--danger)]">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-[11px] text-[var(--text-dim)]">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
export type { TextareaProps }
