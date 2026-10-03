/**
 * SavdoGO platformasi — brauzer tomoni.
 *
 * Nom, domen, tariflar va subdomen qoidalari plans.ts da (server ham
 * o'qiydi); bu yerda — manzil bo'yicha nima ochilishini aniqlash va
 * havolalar.
 */
import { PLATFORM, normalizeSlug } from './plans'

export * from './plans'

/**
 * Hostname bo'yicha nima ochilishi kerak.
 *
 *   savdogo.shop, www, localhost, *.vercel.app  → landing
 *   nomi.savdogo.shop, nomi.localhost           → do'kon (slug)
 *   boshqa domen                              → do'kon (o'z domeni)
 *
 * `?shop=nomi` har qanday hostda do'konni ochadi — sinov va lokal
 * ishlab chiqish uchun. `?preview` — ro'yxatdan o'tish formasidagi
 * qoralama (localStorage), serversiz.
 */
export type SiteTarget =
  | { kind: 'landing' }
  | { kind: 'preview' }
  | { kind: 'shop'; slug: string }
  | { kind: 'domain'; host: string }

const PLATFORM_HOSTS = new Set([PLATFORM.rootDomain, `www.${PLATFORM.rootDomain}`, 'localhost', '127.0.0.1'])

export function resolveSiteTarget(location: { hostname: string; search: string }): SiteTarget {
  const params = new URLSearchParams(location.search)
  if (params.has('preview')) return { kind: 'preview' }
  const shopParam = normalizeSlug(params.get('shop') || '')
  if (shopParam) return { kind: 'shop', slug: shopParam }

  const host = location.hostname.toLowerCase()
  if (PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app')) return { kind: 'landing' }

  for (const base of [PLATFORM.rootDomain, 'localhost']) {
    if (host.endsWith(`.${base}`)) {
      const slug = normalizeSlug(host.slice(0, -(base.length + 1)))
      if (slug && slug !== 'www') return { kind: 'shop', slug }
      return { kind: 'landing' }
    }
  }
  return { kind: 'domain', host }
}

/** Biznes nomidan subdomen taklifi: «Kafe Nur» → «kafe-nur». */
export function slugFromName(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
    ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
  }
  const latin = name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
  return normalizeSlug(latin)
}

export function shopUrl(slug: string): string {
  return `https://${slug}.${PLATFORM.rootDomain}`
}

/**
 * Do'konga havola. Platforma domenida — subdomen; lokal ishlab chiqish
 * va Vercel preview'da esa `?shop=` (subdomen u yerda ishlamaydi).
 */
export function shopLink(slug: string): string {
  const host = window.location.hostname
  if (host === PLATFORM.rootDomain || host.endsWith(`.${PLATFORM.rootDomain}`)) return shopUrl(slug)
  return `${window.location.origin}/?shop=${encodeURIComponent(slug)}`
}
