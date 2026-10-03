import { useEffect, useState } from 'react'

/**
 * Landing sahifalari: `/`, `/start` (ro'yxatdan o'tish) va `/qollanma`.
 *
 * Kutubxonasiz — History API. Vercel'da `/start` va `/qollanma` →
 * index.html qayta yozuvi vercel.json da, `vite dev` esa noma'lum
 * manzilni o'zi index.html ga tushiradi.
 */
export type LandingRoute = 'home' | 'start' | 'guide'

const PATHS: Record<LandingRoute, string> = { home: '/', start: '/start', guide: '/qollanma' }

function current(): LandingRoute {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/start') return 'start'
  if (path === '/qollanma') return 'guide'
  return 'home'
}

export function useLandingRoute(): LandingRoute {
  const [route, setRoute] = useState<LandingRoute>(current)
  useEffect(() => {
    const onPop = () => setRoute(current())
    window.addEventListener('popstate', onPop)
    window.addEventListener('lp:navigate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('lp:navigate', onPop)
    }
  }, [])
  return route
}

export function goTo(route: LandingRoute) {
  const path = PATHS[route]
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path + (route === 'home' ? window.location.search : ''))
  }
  window.dispatchEvent(new Event('lp:navigate'))
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}
