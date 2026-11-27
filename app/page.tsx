import BoardSection from '@/components/BoardSection'
import HeroSection from '@/components/HeroSection'
import HowItWorksSection from '@/components/HowItWorksSection'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <BoardSection />
      </main>
      <SiteFooter />
    </>
  )
}
