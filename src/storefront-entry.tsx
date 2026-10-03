import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import './styles.css'
import App from './App'
import { I18nProvider } from './i18n'
import { db } from './lib/firebase'
import { isFirebaseConfigured } from './config/firebase'
import { applyShopTheme, type ShopTheme } from './platform/palette'
import { draftToConfig, emptyDraft, initials, loadDraft, readShopConfig, type ShopConfig } from './platform/shop'
import type { SiteTarget } from './platform/config'
import { setActiveShop } from './shop/active'
import { ShopProvider } from './shop/ShopProvider'
import { ShopUnavailable, type UnavailableReason } from './shop/ShopUnavailable'
import { applySafeArea, waitForTelegram } from './utils/telegram'
import { applyTheme, getStoredTheme } from './utils/theme'

/** Platformaning o'z ranglari — do'kon topilmagan sahifalar uchun. */
const PLATFORM_THEME: ShopTheme = { brand: '#5B4CF5', accent: '#C6F432', font: 'modern' }

type Loaded = { ok: true; shop: ShopConfig } | { ok: false; reason: UnavailableReason }

/**
 * Do'kon hujjatini topadi va JONLI kuzatadi: admin rangni, yetkazish
 * narxini o'zgartirsa yoki to'lov tasdiqlansa, ochiq turgan sayt
 * qayta yuklanmasdan yangilanadi. Birinchi javob — promise natijasi.
 */
function watchShop(shopId: string): Promise<Loaded> {
  return new Promise((resolve) => {
    let first = true
    onSnapshot(
      doc(db, 'shops', shopId),
      (snap) => {
        if (first) {
          first = false
          if (!snap.exists()) return resolve({ ok: false, reason: 'missing' })
          return resolve({ ok: true, shop: readShopConfig(snap.id, snap.data()) })
        }
        if (snap.exists()) applyShop(readShopConfig(snap.id, snap.data()))
      },
      (error) => {
        console.error('[Do‘kon] o‘qib bo‘lmadi:', error)
        if (first) {
          first = false
          resolve({ ok: false, reason: 'error' })
        }
      },
    )
  })
}

/** O'z domeni (kafenur.uz) → do'kon identifikatori: `domains/{host}`. */
async function shopIdByDomain(host: string): Promise<string | null> {
  const clean = host.toLowerCase().replace(/^www\./, '')
  const snap = await getDoc(doc(db, 'domains', clean))
  return snap.exists() ? String(snap.data().shopId || '') || null : null
}

async function loadShop(target: SiteTarget): Promise<Loaded> {
  if (target.kind === 'preview') {
    // Formadagi qoralama — bazasiz; qoralama bo'lmasa bo'sh namuna
    const draft = loadDraft() ?? emptyDraft()
    return { ok: true, shop: draftToConfig(draft) }
  }
  if (!isFirebaseConfigured()) return { ok: false, reason: 'config' }

  try {
    const shopId = target.kind === 'shop' ? target.slug : target.kind === 'domain' ? await shopIdByDomain(target.host) : null
    if (!shopId) return { ok: false, reason: 'missing' }
    return await watchShop(shopId)
  } catch (error) {
    console.error('[Do‘kon] yuklanmadi:', error)
    return { ok: false, reason: 'error' }
  }
}

/** Belgisi — logo bo'lsa o'sha, bo'lmasa brend rangidagi monogramma. */
function setFavicon(shop: ShopConfig) {
  const href = shop.logo || `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${shop.theme.brand}"/>` +
      `<text x="32" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="24" fill="#fff">${initials(shop.name)}</text></svg>`,
  )}`
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => el.remove())
  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = href
  document.head.appendChild(link)
}

/** Surati «hayotiy» bo'ladigan bizneslar — kartochkada rasm to'liq to'ldiriladi. */
const COVER_PHOTO_TYPES = new Set(['restaurant', 'clothing', 'shoes', 'furniture', 'flowers', 'bakery'])

function applyShop(shop: ShopConfig) {
  setActiveShop(shop)
  applyShopTheme(shop.theme)
  document.documentElement.dataset.imgFit = COVER_PHOTO_TYPES.has(shop.type) ? 'cover' : 'contain'
  document.title = shop.tagline ? `${shop.name} — ${shop.tagline}` : shop.name
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    `${shop.name}: onlayn buyurtma${shop.delivery.enabled ? ', yetkazib berish' : ''}${shop.delivery.pickup ? ' va olib ketish' : ''}.`,
  )
  setFavicon(shop)
}

export async function mountStorefront(root: Root, target: SiteTarget) {
  // Telegram mini app: SDK index.html'da faqat Telegram ichida yuklanadi — uni kutamiz
  if (/tgWebApp/.test(location.hash)) await waitForTelegram(2500)

  const loaded = await loadShop(target)
  applyTheme(getStoredTheme())
  applySafeArea()

  if (!loaded.ok || loaded.shop.status === 'blocked') {
    applyShopTheme(loaded.ok ? loaded.shop.theme : PLATFORM_THEME)
    root.render(<ShopUnavailable reason={loaded.ok ? 'blocked' : loaded.reason} />)
    window.dispatchEvent(new Event('app:ready'))
    return
  }

  setActiveShop(loaded.shop, { preview: target.kind === 'preview' })
  applyShop(loaded.shop)

  root.render(
    <StrictMode>
      <ShopProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ShopProvider>
    </StrictMode>,
  )
  // Yuklanish belgisini App mahsulotlar kelgach o'zi olib tashlaydi ('app:ready')
}
