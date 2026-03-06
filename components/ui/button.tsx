'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[11px] gap-1.5 rounded-md',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-[7px]',
  lg: 'h-11 px-5 text-[14px] gap-2 rounded-[8px]',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--accent)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
    'hover:bg-[var(--accent-hover)]',
    'active:brightness-95',
  ].join(' '),
  secondary: [
    'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]',
    'hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--text-secondary)]',
    'hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
  ].join(' '),
  danger: [
    'bg-[var(--danger)] text-white',
    'hover:brightness-110',
  ].join(' '),
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'select-none cursor-pointer',
          sizeClasses[size],
          variantClasses[variant],
          loading && 'pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon && !loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps, ButtonVariant, ButtonSize }
