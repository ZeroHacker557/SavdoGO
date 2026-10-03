import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Steps } from './sections/Steps'
import { Features } from './sections/Features'
import { Studio } from './sections/Studio'
import { Numbers, Pricing } from './sections/Pricing'
import { Faq, Final, Footer } from './sections/Closing'
import { useLandingReveal } from './hooks'
import { goTo } from './router'
import { useOwnerShop } from './owner'

export function LandingPage() {
  useLandingReveal()
  const owner = useOwnerShop()

  // Mobil pastki tugma: hero'dagi tugma ko'rinmay qolgach chiqadi,
  // oxirgi chaqiriq bo'limida esa yashirinadi (ikki tugma yonma-yon turmasin)
  const [stickyVisible, setStickyVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 700
      setStickyVisible(window.scrollY > 640 && !nearEnd)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Steps />
        <Features />
        <Studio />
        <Numbers />
        <Pricing />
        <Faq />
        <Final />
      </main>
      <Footer />
      <div className={`lp-sticky-cta${stickyVisible ? '' : ' is-hidden'}`}>
        {owner ? (
          <a className="lp-btn lp-btn--primary" href="/admin">
            <LayoutDashboard size={18} /> «{owner.name}» — admin panel
          </a>
        ) : (
          <button className="lp-btn lp-btn--primary" onClick={() => goTo('start')}>
            Do‘konimni yaratish <ArrowRight size={18} />
          </button>
        )}
      </div>
    </>
  )
}
