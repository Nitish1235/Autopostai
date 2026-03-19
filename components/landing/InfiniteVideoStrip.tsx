'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface VideoItem {
  id: number | string
  title: string
  gradient: string
  thumbnail?: string
  thumbnailUrl?: string | null
}

const VIDEOS: VideoItem[] = [
  { id: 1, title: '5 Money Habits', gradient: 'from-emerald-500/30 to-teal-600/30' },
  { id: 2, title: 'AI Will Change...', gradient: 'from-blue-500/30 to-indigo-600/30' },
  { id: 3, title: 'Morning Routine', gradient: 'from-orange-500/30 to-red-600/30' },
  { id: 4, title: 'Crypto Explained', gradient: 'from-violet-500/30 to-purple-600/30' },
  { id: 5, title: 'Stoic Wisdom', gradient: 'from-amber-500/30 to-yellow-600/30' },
  { id: 6, title: 'Side Hustle Ideas', gradient: 'from-pink-500/30 to-rose-600/30' },
  { id: 7, title: 'Study Tips', gradient: 'from-cyan-500/30 to-blue-600/30' },
  { id: 8, title: 'Dark Psychology', gradient: 'from-gray-500/30 to-zinc-600/30' },
]

function VideoCard({ video }: { video: VideoItem }) {
  return (
    <div className="w-[140px] flex-shrink-0 mx-2">
      <div
        className={cn(
          'aspect-[9/16] rounded-[12px] overflow-hidden relative',
          'bg-gradient-to-br',
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
          <div className="absolute inset-0 flex items-end p-3">
            <span className="text-[11px] font-semibold text-white/70 leading-tight">
              {video.title}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

function InfiniteVideoStrip() {
  const [dbVideos, setDbVideos] = useState<VideoItem[]>([])

  useEffect(() => {
    fetch('/api/admin/videos?public=true&section=strip')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setDbVideos(data.data)
        }
      })
      .catch(() => {})
  }, [])

  const displayVideos = dbVideos.length > 0 ? dbVideos : VIDEOS

  // Duplicate for seamless loop
  const items = [...displayVideos, ...displayVideos, ...displayVideos]

  return (
    <section className="py-12 overflow-hidden">
      {/* Top row - scroll left */}
      <motion.div
        className="flex"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 30,
            ease: 'linear',
          },
        }}
      >
        {items.map((video, i) => (
          <VideoCard key={`top-${video.id}-${i}`} video={video} />
        ))}
      </motion.div>

      {/* Bottom row - scroll right */}
      <div className="mt-3">
        <motion.div
          className="flex"
          animate={{ x: ['-33.33%', '0%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 35,
              ease: 'linear',
            },
          }}
        >
          {[...items].reverse().map((video, i) => (
            <VideoCard key={`bottom-${video.id}-${i}`} video={video} />
          ))}
        </motion.div>
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10" />
    </section>
  )
}

export { InfiniteVideoStrip }
