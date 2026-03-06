'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: TooltipSide
  delay?: number
}

function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const gap = 8

    switch (side) {
      case 'top':
        setCoords({ x: rect.left + rect.width / 2, y: rect.top - gap })
        break
      case 'bottom':
        setCoords({ x: rect.left + rect.width / 2, y: rect.bottom + gap })
        break
      case 'left':
        setCoords({ x: rect.left - gap, y: rect.top + rect.height / 2 })
        break
      case 'right':
        setCoords({ x: rect.right + gap, y: rect.top + rect.height / 2 })
        break
    }
  }, [side])

  const handleEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition()
      setVisible(true)
    }, delay)
  }, [delay, calculatePosition])

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  const transformOrigin: Record<TooltipSide, string> = {
    top: 'center bottom',
    bottom: 'center top',
    left: 'right center',
    right: 'left center',
  }

  const translateStyle: Record<TooltipSide, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0%)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0%, -50%)',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {visible && (
              <motion.div
                className="fixed z-[200] pointer-events-none px-2.5 py-1.5 rounded-md bg-black/90 text-white text-[11px] max-w-[200px] text-center leading-tight"
                style={{
                  left: coords.x,
                  top: coords.y,
                  transform: translateStyle[side],
                  transformOrigin: transformOrigin[side],
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

export { Tooltip }
export type { TooltipProps }
