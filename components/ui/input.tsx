'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

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
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-[14px] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 px-3 rounded-[8px]',
              'bg-[var(--bg-card)] border border-[var(--border)]',
              'text-[var(--text-primary)] text-[13px]',
              'placeholder:text-[var(--text-dim)]',
              'transition-[border-color,box-shadow] duration-150',
              'focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-subtle)]',
              error && 'border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(255,69,58,0.15)]',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-[14px] pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
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

Input.displayName = 'Input'

export { Input }
export type { InputProps }
