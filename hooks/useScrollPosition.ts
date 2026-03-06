'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0)
  const rafRef = useRef<number | null>(null)

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return

    rafRef.current = requestAnimationFrame(() => {
      setScrollY(window.scrollY)
      rafRef.current = null
    })
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Set initial value
    setScrollY(window.scrollY)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [handleScroll])

  return scrollY
}
