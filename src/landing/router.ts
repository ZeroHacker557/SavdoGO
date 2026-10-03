import { useEffect, useState } from 'react'

/**
 * Landingning ikki sahifasi: `/` va `/start` (ro'yxatdan o'tish).
 *
 * Kutubxonasiz — History API. Vercel'da `/start` → index.html qayta
 * yozuvi vercel.json da, `vite dev` esa noma'lum manzilni o'zi
 * index.html ga tushiradi.
 */
export type LandingRoute = 'home' | 'start'

function current(): LandingRoute {
  return window.location.pathname.replace(/\/+$/, '') === '/start' ? 'start' : 'home'
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
  const path = route === 'start' ? '/start' : '/'
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path + (route === 'home' ? window.location.search : ''))
  }
  window.dispatchEvent(new Event('lp:navigate'))
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}
