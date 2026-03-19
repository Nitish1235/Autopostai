'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface GridVideo {
  id: number | string
  title: string
  niche: string
  gradient: string
  thumbnail?: string
  thumbnailUrl?: string | null
}

const SAMPLE_VIDEOS: GridVideo[] = [
  { id: 1, title: '5 Money Habits of the Rich', niche: 'Finance', gradient: 'from-emerald-500/40 to-teal-700/40' },
  { id: 2, title: 'AI Tools You Need in 2025', niche: 'Tech', gradient: 'from-blue-500/40 to-indigo-700/40' },
  { id: 3, title: 'Morning Routine for Success', niche: 'Productivity', gradient: 'from-orange-500/40 to-red-700/40' },
  { id: 4, title: 'Stoic Quotes for Tough Days', niche: 'Philosophy', gradient: 'from-violet-500/40 to-purple-700/40' },
  { id: 5, title: 'Hidden Travel Gems', niche: 'Travel', gradient: 'from-cyan-500/40 to-blue-700/40' },
  { id: 6, title: 'Dark Psychology Secrets', niche: 'Psychology', gradient: 'from-gray-600/40 to-zinc-800/40' },
]

import { useState, useEffect } from 'react'

function VideoGrid() {
  const [dbVideos, setDbVideos] = useState<GridVideo[]>([])

  useEffect(() => {
    fetch('/api/admin/videos?public=true&section=grid')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setDbVideos(data.data)
        }
      })
      .catch(() => {})
  }, [])

  const displayVideos = dbVideos.length > 0 ? dbVideos : SAMPLE_VIDEOS

  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[var(--accent)] mb-3">
            Made With AutoPost AI
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
            See what creators are building
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {displayVideos.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group cursor-pointer"
            >
              <div
                className={cn(
                  'aspect-[9/16] rounded-[12px] overflow-hidden relative bg-gradient-to-br',
                  video.gradient,
                  'group-hover:scale-[1.02] transition-transform duration-300'
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
                    {/* Mock play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                      </div>
                    </div>
                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                        {video.niche}
                      </span>
                      <p className="text-[11px] font-medium text-white/90 leading-tight mt-0.5">
                        {video.title}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { VideoGrid }
