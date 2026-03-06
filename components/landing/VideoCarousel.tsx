'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Eye, Heart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CarouselVideo {
  id: string | number
  title: string
  niche: string
  views: string
  likes: string
  gradient: string
  thumbnail?: string | null
  thumbnailUrl?: string | null
  videoUrl?: string | null
}

const FALLBACK_SHOWCASE: CarouselVideo[] = [
  {
    id: 1,
    title: '5 Money Habits That Changed My Life',
    niche: 'Finance',
    views: '2.4M',
    likes: '180K',
    gradient: 'from-emerald-600/50 to-teal-800/50',
  },
  {
    id: 2,
    title: 'AI Will Replace These Jobs in 2025',
    niche: 'Technology',
    views: '1.8M',
    likes: '120K',
    gradient: 'from-blue-600/50 to-indigo-800/50',
  },
  {
    id: 3,
    title: 'The 5 AM Morning Routine',
    niche: 'Productivity',
    views: '3.1M',
    likes: '240K',
    gradient: 'from-orange-600/50 to-red-800/50',
  },
  {
    id: 4,
    title: 'Marcus Aurelius on Adversity',
    niche: 'Philosophy',
    views: '900K',
    likes: '85K',
    gradient: 'from-violet-600/50 to-purple-800/50',
  },
  {
    id: 5,
    title: 'Hidden Gems in Southeast Asia',
    niche: 'Travel',
    views: '1.2M',
    likes: '95K',
    gradient: 'from-cyan-600/50 to-blue-800/50',
  },
]

function VideoCarousel() {
  const [current, setCurrent] = useState(0)
  const [videos, setVideos] = useState<CarouselVideo[]>(FALLBACK_SHOWCASE)

  useEffect(() => {
    fetch('/api/admin/videos?public=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setVideos(data.data)
        }
      })
      .catch(() => {
        // Keep fallback
      })
  }, [])

  const video = videos[current]

  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[var(--accent)] mb-3">
            Showcase
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
            Real results from real creators
          </h2>
        </motion.div>

        <div className="relative flex items-center justify-center">
          {/* Nav buttons */}
          <button
            onClick={() => setCurrent((c) => (c === 0 ? videos.length - 1 : c - 1))}
            className="absolute left-0 z-10 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => setCurrent((c) => (c === videos.length - 1 ? 0 : c + 1))}
            className="absolute right-0 z-10 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>

          {/* Carousel window */}
          <div className="w-full max-w-[300px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={cn(
                    'aspect-[9/16] rounded-[16px] overflow-hidden relative bg-gradient-to-br',
                    video.gradient
                  )}
                >
                  {(video.thumbnail || video.thumbnailUrl) ? (
                    <img
                      src={video.thumbnailUrl || video.thumbnail || ''}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors">
                          <Play size={24} className="text-white ml-1" />
                        </div>
                      </div>

                      {/* Bottom overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          {video.niche}
                        </span>
                        <p className="text-[14px] font-semibold text-white mt-1 leading-tight">
                          {video.title}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-[11px] text-white/70">
                            <Eye size={12} /> {video.views}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-white/70">
                            <Heart size={12} /> {video.likes}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {videos.map((_: CarouselVideo, i: number) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all cursor-pointer',
                i === current
                  ? 'bg-[var(--accent)] w-6'
                  : 'bg-[var(--text-dim)]/30 hover:bg-[var(--text-dim)]'
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export { VideoCarousel }
