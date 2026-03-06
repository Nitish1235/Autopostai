import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { InfiniteVideoStrip } from '@/components/landing/InfiniteVideoStrip'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeatureBlock } from '@/components/landing/FeatureBlock'
import { VideoGrid } from '@/components/landing/VideoGrid'
import { VideoCarousel } from '@/components/landing/VideoCarousel'
import { Pricing } from '@/components/landing/Pricing'
import { CtaBanner } from '@/components/landing/CtaBanner'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <Hero />
      <InfiniteVideoStrip />
      <HowItWorks />
      <FeatureBlock />
      <VideoGrid />
      <VideoCarousel />
      <Pricing />
      <CtaBanner />
      <Footer />
    </main>
  )
}
