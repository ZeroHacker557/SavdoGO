import { createRoot } from 'react-dom/client'
import { resolveSiteTarget } from './platform/config'

/**
 * Yagona kirish nuqtasi. Manzilga qarab ikkidan biri yuklanadi:
 *
 *   savdogo.shop, localhost        → landing va ro'yxatdan o'tish
 *   nomi.savdogo.shop, o'z domeni  → do'kon sayti (shops/{nomi})
 *
 * Ikkalasi alohida bo'lak (chunk): landing ochgan odam do'kon kodini,
 * xaridor esa landing kodini yuklamaydi.
 */
const root = createRoot(document.getElementById('root')!)
const target = resolveSiteTarget(window.location)

/** Yuklanish belgisini (index.html #boot) silliq olib tashlaydi. */
function hideBoot() {
  const boot = document.getElementById('boot')
  if (!boot) return
  boot.classList.add('is-leaving')
  window.setTimeout(() => boot.remove(), 400)
}
window.addEventListener('app:ready', hideBoot, { once: true })

if (target.kind === 'landing') {
  void import('./landing/main').then((m) => {
    m.mountLanding(root)
    hideBoot()
  })
} else {
  void import('./storefront-entry').then((m) => m.mountStorefront(root, target))
}
