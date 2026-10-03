/**
 * SavdoGO — brauzer va server uchun UMUMIY qiymatlar.
 *
 * Bu fayl api/ (Vercel funksiyalari) tomonidan ham import qilinadi,
 * shuning uchun bu yerda `window`, DOM yoki React bo'lmasin. Brauzerga
 * xos yordamchilar — config.ts da (u shu faylni qayta eksport qiladi).
 *
 * Narx o'zgarsa — faqat shu fayl: landing, forma, admin paneldagi
 * to'lov sahifasi va serverdagi tasdiqlash shu yerdan o'qiydi.
 */
export const PLATFORM = {
  name: 'SavdoGO',
  /** Do'konlar shu domenning subdomenida ochiladi: nomi.savdogo.shop */
  rootDomain: 'savdogo.shop',
  tagline: 'Biznesingiz uchun tayyor onlayn do‘kon',

  phone: '+998 97 400 98 77',
  phoneHref: 'tel:+998974009877',
  telegram: '@for_name',
  telegramHref: 'https://t.me/for_name',
  email: 'abubakrfrontend@gmail.com',
  /**
   * SavdoGO boti (PLATFORM_BOT_TOKEN egasi) — @ siz. Bo'sh bo'lsa landingdagi
   * «Telegram orqali ochish» tugmasi ko'rinmaydi; bot o'zi baribir ishlaydi.
   */
  botUsername: '' as string,
} as const

/** SavdoGO botiga havola (bot sozlanmagan bo'lsa — null). */
export function platformBotLink(): string | null {
  return PLATFORM.botUsername ? `https://t.me/${PLATFORM.botUsername}` : null
}

export type PlanId = 'week' | 'month' | 'year'

export type Plan = {
  id: PlanId
  name: string
  /** So'mda. */
  price: number
  /** Necha kun amal qiladi. */
  days: number
  /** Kartada ko'rinadigan davr: «haftasiga», «oyiga»... */
  per: string
  /** Narx yonidagi birlik: «so'm / oy». */
  unit: string
  /** Oylik tarifga nisbatan tejash (so'm) — faqat ko'rsatish uchun. */
  note?: string
  popular?: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  week: { id: 'week', name: 'Haftalik', price: 89_000, days: 7, per: 'haftasiga', unit: 'hafta', note: 'Qisqa muddatga qulay' },
  month: { id: 'month', name: 'Oylik', price: 199_000, days: 30, per: 'oyiga', unit: 'oy', popular: true },
  year: { id: 'year', name: 'Yillik', price: 2_000_000, days: 365, per: 'yiliga', unit: 'yil' },
}

export const PLAN_ORDER: PlanId[] = ['week', 'month', 'year']

/** Yillik tarif oylikka nisbatan qancha tejaydi (12 oy × oylik − yillik). */
export const YEAR_SAVING = PLANS.month.price * 12 - PLANS.year.price
export const YEAR_SAVING_PERCENT = Math.round((YEAR_SAVING / (PLANS.month.price * 12)) * 100)

/**
 * Bepul sinov: yangi do'kon shuncha kun TO'LIQ ishlaydi — mahsulot
 * qo'shish, buyurtma qabul qilish, hamma bo'lim ochiq. Muddat tugagach
 * do'kon «obuna tugagan» holatiga o'tadi va tanlangan tarif to'lanadi.
 * O'z Telegram botini ulash — sinovda ham, keyin ham bepul.
 */
export const TRIAL_DAYS = 10

export function formatSum(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`
}

/** Subdomen uchun yaroqli nom: kichik lotin harflari, raqam va chiziqcha. */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[ʻʼ'`‘’]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** Subdomen bo'la olmaydigan nomlar — platformaning o'z sahifalari. */
export const RESERVED_SLUGS = new Set([
  'www', 'admin', 'api', 'app', 'super', 'panel', 'mail', 'static', 'cdn', 'assets',
  'savdogo', 'help', 'support', 'blog', 'docs', 'status', 'dev', 'test', 'demo',
])
