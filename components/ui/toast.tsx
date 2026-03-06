'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (opts: { message: string; type?: ToastType; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

const dotColors: Record<ToastType, string> = {
  success: 'bg-[var(--success)]',
  error: 'bg-[var(--danger)]',
  info: 'bg-[var(--accent)]',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const idRef = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({
      message,
      type = 'info',
      duration = 4000,
    }: {
      message: string
      type?: ToastType
      duration?: number
    }) => {
      const id = `toast-${++idRef.current}`
      const newToast: ToastMessage = { id, message, type, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'pointer-events-auto flex items-center gap-3',
                'bg-[var(--bg-secondary)] border border-[var(--border)]',
                'rounded-10 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
                'min-w-[260px] max-w-[360px]'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  dotColors[t.type]
                )}
              />
              <span className="text-[13px] text-[var(--text-primary)] flex-1">
                {t.message}
              </span>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
