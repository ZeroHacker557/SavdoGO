import { businessType, type BusinessTypeId, type FontPairId } from '../../../src/platform/business-types.js'
import { RESERVED_SLUGS, normalizeSlug, type PlanId } from '../../../src/platform/plans.js'

/**
 * Formadan kelgan qoralamani tekshiradi va tozalaydi.
 *
 * Mijoz brauzeriga ishonilmaydi: har bir maydon uzunligi cheklanadi,
 * ranglar HEX ekani, raqamlar manfiy emasligi tekshiriladi. Noto'g'ri
 * yoki yo'q maydon o'rniga biznes turining standart qiymati olinadi.
 */

/** Foydalanuvchi ma'lumotidagi xato — matni ekranda ko'rsatiladi. */
export class DraftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DraftError'
  }
}

export type ShopDoc = {
  name: string
  tagline: string
  type: BusinessTypeId
  logo: string | null
  theme: { brand: string; accent: string; font: FontPairId }
  contacts: { phone: string; telegram: string; instagram: string; city: string; address: string; workHours: string }
  delivery: { enabled: boolean; pickup: boolean; fee: number; freeFrom: number; minOrder: number }
  payments: { cash: boolean; card: boolean; cardNumber: string; cardOwner: string }
  plan: PlanId
  telegramAddon: boolean
}

export type OwnerInput = { name: string; email: string; password: string; phone: string }

const FONTS: FontPairId[] = ['modern', 'bold', 'elegant', 'friendly']

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sum(value: unknown): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000_000) : 0
}

function hex(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function readSlug(value: unknown): string {
  const slug = normalizeSlug(typeof value === 'string' ? value : '')
  if (slug.length < 3) throw new DraftError('Do‘kon manzili kamida 3 ta belgidan iborat bo‘lsin')
  if (RESERVED_SLUGS.has(slug)) throw new DraftError('Bu manzilni tanlab bo‘lmaydi — boshqasini kiriting')
  return slug
}

export function readDraft(raw: unknown): ShopDoc & { slug: string; logoData: string | null } {
  const d = obj(raw)
  const type = businessType(str(d.type, 30))
  const theme = obj(d.theme)
  const contacts = obj(d.contacts)
  const delivery = obj(d.delivery)
  const payments = obj(d.payments)

  const name = str(d.name, 60)
  if (name.length < 2) throw new DraftError('Biznes nomini kiriting')

  const phone = str(contacts.phone, 30)
  if (!/^998\d{9}$/.test(phoneDigits(phone))) throw new DraftError('Biznes telefon raqami noto‘g‘ri')

  const cardEnabled = payments.card === true
  const cardNumber = phoneDigits(str(payments.cardNumber, 30))
  if (cardEnabled && cardNumber.length !== 16) throw new DraftError('Karta raqami 16 ta raqamdan iborat bo‘lishi kerak')

  const deliveryEnabled = delivery.enabled !== false
  const pickup = delivery.pickup !== false
  if (!deliveryEnabled && !pickup) throw new DraftError('Yetkazish yoki olib ketishdan kamida bittasi yoqilgan bo‘lsin')

  const cash = payments.cash !== false
  if (!cash && !cardEnabled) throw new DraftError('Kamida bitta to‘lov usuli yoqilgan bo‘lsin')

  const plan = str(d.plan, 10) as PlanId
  const logoData = typeof d.logo === 'string' && d.logo.startsWith('data:image/') ? d.logo : null
  if (logoData && logoData.length > 1_500_000) throw new DraftError('Logo fayli juda katta')

  return {
    slug: readSlug(d.slug),
    name,
    tagline: str(d.tagline, 80),
    type: type.id,
    logo: null,
    logoData,
    theme: {
      brand: hex(theme.brand, type.brand),
      accent: hex(theme.accent, type.accent),
      font: FONTS.includes(theme.font as FontPairId) ? (theme.font as FontPairId) : type.font,
    },
    contacts: {
      phone,
      telegram: str(contacts.telegram, 40).replace(/\s/g, ''),
      instagram: str(contacts.instagram, 40).replace(/[\s@]/g, ''),
      city: str(contacts.city, 40) || 'Toshkent',
      address: str(contacts.address, 160),
      workHours: str(contacts.workHours, 40),
    },
    delivery: {
      enabled: deliveryEnabled,
      pickup,
      fee: sum(delivery.fee),
      freeFrom: sum(delivery.freeFrom),
      minOrder: sum(delivery.minOrder),
    },
    payments: {
      cash,
      card: cardEnabled,
      cardNumber: cardEnabled ? cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ') : '',
      cardOwner: cardEnabled ? str(payments.cardOwner, 60).toUpperCase() : '',
    },
    plan: ['week', 'month', 'year'].includes(plan) ? plan : 'month',
    telegramAddon: d.telegramAddon === true,
  }
}

/**
 * Admin paneldagi «Dizayn va aloqa» bo'limi: nom, shior, logo, ranglar,
 * shrift va aloqa. Logo yangi yuklangan bo'lsa (data URL) — Storage'ga,
 * o'zgarmagan bo'lsa (https havola) — o'zicha qoladi, null — o'chiriladi.
 */
export async function readBrandPatch(raw: unknown, shopId: string) {
  const d = obj(raw)
  const theme = obj(d.theme)
  const contacts = obj(d.contacts)

  const name = str(d.name, 60)
  if (name.length < 2) throw new DraftError('Do‘kon nomini kiriting')
  const phone = str(contacts.phone, 30)
  if (!/^998\d{9}$/.test(phoneDigits(phone))) throw new DraftError('Telefon raqami noto‘g‘ri')

  let logo: string | null | undefined
  if (d.logo === null) logo = null
  else if (typeof d.logo === 'string' && d.logo.startsWith('data:image/')) {
    const { uploadDataUrl } = await import('./files.js')
    logo = await uploadDataUrl(d.logo, `shops/${shopId}/logo-${Date.now()}`, 1_000_000)
  } else if (typeof d.logo === 'string' && /^https:\/\//.test(d.logo)) logo = d.logo.slice(0, 2000)

  const hero = d.hero !== undefined ? await readHero(obj(d.hero), shopId) : undefined

  return {
    name,
    tagline: str(d.tagline, 80),
    ...(logo !== undefined ? { logo } : {}),
    ...(hero ? { hero } : {}),
    theme: {
      brand: hex(theme.brand, '#4F46E5'),
      accent: hex(theme.accent, '#F59E0B'),
      font: FONTS.includes(theme.font as FontPairId) ? (theme.font as FontPairId) : 'modern',
    },
    contacts: {
      phone,
      telegram: str(contacts.telegram, 40).replace(/\s/g, ''),
      instagram: str(contacts.instagram, 40).replace(/[\s@]/g, ''),
      city: str(contacts.city, 40),
      address: str(contacts.address, 160),
      workHours: str(contacts.workHours, 40),
    },
  }
}

/**
 * Bosh sahifa banneri. Rasm: yangi yuklangan (data URL) — Storage'ga;
 * https havola — o'zgarmagan; «none» — rasmsiz; null — biznes turining
 * standart rasmi. Rang: HEX yoki null (brend rangi).
 */
async function readHero(h: Record<string, unknown>, shopId: string) {
  let image: string | null = null
  if (h.image === 'none') image = 'none'
  else if (typeof h.image === 'string' && h.image.startsWith('data:image/')) {
    const { uploadDataUrl } = await import('./files.js')
    image = await uploadDataUrl(h.image, `shops/${shopId}/hero-${Date.now()}`, 3_000_000)
  } else if (typeof h.image === 'string' && /^https:\/\//.test(h.image)) image = h.image.slice(0, 2000)

  return {
    image,
    title: str(h.title, 80),
    subtitle: str(h.subtitle, 120),
    color: typeof h.color === 'string' && /^#[0-9a-f]{6}$/i.test(h.color.trim()) ? h.color.trim() : null,
    layout: ['classic', 'immersive', 'split', 'bento'].includes(String(h.layout)) ? String(h.layout) : 'classic',
  }
}

export function readOwner(raw: unknown): OwnerInput {
  const o = obj(raw)
  const name = str(o.name, 60)
  const email = str(o.email, 120).toLowerCase()
  const password = typeof o.password === 'string' ? o.password : ''
  const phone = str(o.phone, 30)
  if (name.length < 2) throw new DraftError('Ismingizni kiriting')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new DraftError('Email manzili noto‘g‘ri')
  if (password.length < 8 || password.length > 128) throw new DraftError('Parol kamida 8 ta belgidan iborat bo‘lsin')
  if (!/^998\d{9}$/.test(phoneDigits(phone))) throw new DraftError('Telefon raqamingiz noto‘g‘ri')
  return { name, email, password, phone }
}
