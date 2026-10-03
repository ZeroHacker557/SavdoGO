import { businessType, type BusinessTypeId, type FontPairId } from './business-types'
import { isHexColor, type ShopTheme } from './palette'
import type { PlanId } from './config'

/**
 * Do'kon holati.
 *
 *   demo     — to'lov qilinmagan va sinov yo'q: faqat ko'rish
 *   active   — hamma amallar ochiq (`paidUntil` gacha). Yangi do'kon
 *              shu holatda ochiladi: TRIAL_DAYS kunlik bepul sinov,
 *              `trial: true` — birinchi to'lov tasdiqlanguncha
 *   expired  — muddat tugagan: sayt ochiladi, lekin buyurtma olinmaydi
 *   blocked  — platforma egasi to'xtatgan
 */
export type ShopStatus = 'demo' | 'active' | 'expired' | 'blocked'

/**
 * Banner ko'rinishi (components/home/HomeHero.tsx):
 *   classic   — rangli karta, o'ngda rasm
 *   immersive — butun karta rasm, matn pastda
 *   split     — chapda matn va raqamlar, o'ngda rasm
 *   bento     — katta banner + kategoriya va yetkazish plitalari
 */
export type HeroLayout = 'classic' | 'immersive' | 'split' | 'bento'
export const HERO_LAYOUTS: HeroLayout[] = ['classic', 'immersive', 'split', 'bento']

/**
 * Bosh sahifadagi katta banner (hero). Hammasi ixtiyoriy — bo'sh bo'lsa
 * biznes turining standart rasmi, sarlavhasi va do'konning brend rangi.
 */
export type ShopHero = {
  /** null — biznes turining rasmi; «none» — rasmsiz; aks holda rasm manzili. */
  image: string | null
  title: string
  subtitle: string
  /** Banner foni. null — brend rangi. */
  color: string | null
  layout: HeroLayout
}

export const EMPTY_HERO: ShopHero = { image: null, title: '', subtitle: '', color: null, layout: 'classic' }

/**
 * Do'konning OMMAVIY hujjati — `shops/{slug}`.
 *
 * Mijozning brauzeri shuni o'qib saytni chizadi: nomi, logosi, ranglari,
 * aloqa va yetkazish shartlari. Maxfiy narsalar (egasining emaili,
 * to'lov cheklari) bu yerda EMAS — `shopPrivate/{slug}` da.
 */
export type ShopConfig = {
  id: string
  name: string
  tagline: string
  type: BusinessTypeId
  /** Logo manzili. Bo'sh bo'lsa nomning bosh harflaridan belgi chiziladi. */
  logo: string | null
  theme: ShopTheme
  hero: ShopHero
  contacts: {
    phone: string
    telegram: string
    instagram: string
    city: string
    address: string
    workHours: string
  }
  delivery: {
    enabled: boolean
    pickup: boolean
    fee: number
    freeFrom: number
    minOrder: number
  }
  payments: {
    cash: boolean
    card: boolean
    cardNumber: string
    cardOwner: string
  }
  status: ShopStatus
  plan: PlanId
  paidUntil: string | null
  /** Bepul sinov davri: `paidUntil` — sinov tugaydigan kun. */
  trial: boolean
  telegramAddon: boolean
  botUsername: string | null
  customDomain: string | null
  createdAt: string
}

/** Formadagi qoralama — hali saqlanmagan do'kon. */
export type ShopDraft = Omit<ShopConfig, 'id' | 'status' | 'paidUntil' | 'trial' | 'botUsername' | 'customDomain' | 'createdAt'> & {
  slug: string
}

export function emptyDraft(typeId: BusinessTypeId = 'restaurant'): ShopDraft {
  const type = businessType(typeId)
  return {
    slug: '',
    name: '',
    tagline: '',
    type: type.id,
    logo: null,
    theme: { brand: type.brand, accent: type.accent, font: type.font },
    hero: { ...EMPTY_HERO },
    contacts: { phone: '', telegram: '', instagram: '', city: 'Toshkent', address: '', workHours: '09:00 — 21:00' },
    delivery: { enabled: true, pickup: true, ...type.delivery },
    payments: { cash: true, card: false, cardNumber: '', cardOwner: '' },
    plan: 'month',
    telegramAddon: false,
  }
}

/** Qoralamani «haqiqiy» do'kon ko'rinishiga keltiradi — oldindan ko'rish uchun. */
export function draftToConfig(draft: ShopDraft, overrides: Partial<ShopConfig> = {}): ShopConfig {
  return {
    ...draft,
    id: draft.slug || 'preview',
    name: draft.name || 'Do‘koningiz nomi',
    status: 'demo',
    paidUntil: null,
    trial: false,
    botUsername: null,
    customDomain: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function str(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0
}

/**
 * Firestore'dan kelgan xom hujjatni tekshirib o'qiydi.
 *
 * Bazada maydon yo'q yoki noto'g'ri bo'lsa — biznes turining
 * standart qiymati olinadi: sayt hech qachon «undefined» ranglar
 * bilan chizilmasin.
 */
export function readShopConfig(id: string, raw: Record<string, unknown>): ShopConfig {
  const type = businessType(str(raw.type))
  const theme = (raw.theme ?? {}) as Record<string, unknown>
  const contacts = (raw.contacts ?? {}) as Record<string, unknown>
  const delivery = (raw.delivery ?? {}) as Record<string, unknown>
  const payments = (raw.payments ?? {}) as Record<string, unknown>
  const hero = (raw.hero ?? {}) as Record<string, unknown>
  const status = str(raw.status) as ShopStatus
  const plan = str(raw.plan) as PlanId

  return {
    id,
    name: str(raw.name, 80) || id,
    tagline: str(raw.tagline, 120),
    type: type.id,
    logo: str(raw.logo, 2000) || null,
    theme: {
      brand: isHexColor(theme.brand) ? String(theme.brand) : type.brand,
      accent: isHexColor(theme.accent) ? String(theme.accent) : type.accent,
      font: (['modern', 'bold', 'elegant', 'friendly'] as FontPairId[]).includes(theme.font as FontPairId)
        ? (theme.font as FontPairId)
        : type.font,
    },
    hero: {
      image: str(hero.image, 2000) || null,
      title: str(hero.title, 80),
      subtitle: str(hero.subtitle, 120),
      color: isHexColor(hero.color) ? String(hero.color) : null,
      layout: HERO_LAYOUTS.includes(hero.layout as HeroLayout) ? (hero.layout as HeroLayout) : 'classic',
    },
    contacts: {
      phone: str(contacts.phone, 40),
      telegram: str(contacts.telegram, 60),
      instagram: str(contacts.instagram, 60),
      city: str(contacts.city, 60),
      address: str(contacts.address, 200),
      workHours: str(contacts.workHours, 60),
    },
    delivery: {
      enabled: delivery.enabled !== false,
      pickup: delivery.pickup !== false,
      fee: num(delivery.fee),
      freeFrom: num(delivery.freeFrom),
      minOrder: num(delivery.minOrder),
    },
    payments: {
      cash: payments.cash !== false,
      card: payments.card === true,
      cardNumber: str(payments.cardNumber, 30),
      cardOwner: str(payments.cardOwner, 80),
    },
    status: ['demo', 'active', 'expired', 'blocked'].includes(status) ? status : 'demo',
    plan: ['week', 'month', 'year'].includes(plan) ? plan : 'month',
    paidUntil: str(raw.paidUntil, 40) || null,
    trial: raw.trial === true,
    telegramAddon: raw.telegramAddon === true,
    botUsername: str(raw.botUsername, 60) || null,
    customDomain: str(raw.customDomain, 120) || null,
    createdAt: str(raw.createdAt, 40),
  }
}

/** Hero rasmi: o'ziniki, biznes turining standarti yoki yo'q (null). */
export function heroImageOf(shop: Pick<ShopConfig, 'type' | 'hero'>): string | null {
  const image = shop.hero?.image
  if (image === 'none') return null
  return image || businessType(shop.type).hero.image
}

/** Do'kon hozir buyurtma qabul qila oladimi. */
export function canTakeOrders(shop: ShopConfig, now = Date.now()): boolean {
  if (shop.status !== 'active') return false
  if (!shop.paidUntil) return true
  return new Date(shop.paidUntil).getTime() > now
}

/** Nomdan monogramma: «Kafe Nur» → «KN». */
export function initials(name: string): string {
  const words = name.replace(/[«»"'‘’ʻ]/g, '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'S'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const DRAFT_KEY = 'savdogo:draft'

export function saveDraft(draft: ShopDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Logo katta bo'lsa xotira to'lishi mumkin — logosiz saqlaymiz
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, logo: null }))
    } catch {
      /* xotira yopiq */
    }
  }
}

export function loadDraft(): ShopDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ShopDraft>
    const base = emptyDraft(businessType(parsed.type).id)
    return {
      ...base,
      ...parsed,
      theme: { ...base.theme, ...parsed.theme },
      hero: { ...base.hero, ...parsed.hero },
      contacts: { ...base.contacts, ...parsed.contacts },
      delivery: { ...base.delivery, ...parsed.delivery },
      payments: { ...base.payments, ...parsed.payments },
    }
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* xotira yopiq */
  }
}
