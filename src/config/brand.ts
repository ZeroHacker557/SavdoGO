import { PLATFORM } from '../platform/config'
import { businessType } from '../platform/business-types'
import type { ShopConfig } from '../platform/shop'
import { initials } from '../platform/shop'

/**
 * Joriy do'kon brendi — sayt ochilganda do'kon hujjatidan to'ldiriladi.
 *
 * Shablonda bu MUSA konstantalari edi va 20 dan ortiq joyda
 * ishlatiladi (sarlavha, chek, yordam sahifasi, bot havolasi...).
 * Endi o'sha obyekt O'ZGARUVCHAN: `src/storefront-entry.tsx` birinchi
 * chizishdan OLDIN `applyBrand(shop)` ni chaqiradi, keyin hamma
 * komponent odatdagidek `BRAND.name` o'qiydi. Sahifa bitta do'konni
 * ko'rsatadi, shuning uchun modul darajasidagi qiymat yetarli.
 */
export const BRAND = {
  shopId: '',
  name: 'Do‘kon',
  legalName: 'Do‘kon',
  tagline: '',
  taglineRu: '',
  /** Logo manzili; bo'sh bo'lsa nom harflaridan belgi chiziladi. */
  logo: '' as string,
  monogram: 'S',

  /** Telegram bot — mini app shu bot ichida ochiladi (qo'shimcha xizmat). */
  botUsername: '',

  phone: '',
  phoneHref: '',
  email: '',
  telegram: '',
  telegramHref: '',
  instagram: '',
  instagramHref: '',

  city: '',
  address: '',
  workHours: '',
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
}

export function applyBrand(shop: ShopConfig) {
  const type = businessType(shop.type)
  const tg = shop.contacts.telegram.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')
  const ig = shop.contacts.instagram.replace(/^@/, '')
  Object.assign(BRAND, {
    shopId: shop.id,
    name: shop.name,
    legalName: shop.name,
    tagline: shop.tagline || type.name,
    taglineRu: shop.tagline || type.nameRu,
    logo: shop.logo || '',
    monogram: initials(shop.name),
    botUsername: shop.botUsername || '',
    phone: shop.contacts.phone,
    phoneHref: telHref(shop.contacts.phone),
    email: '',
    telegram: tg ? `@${tg}` : '',
    telegramHref: tg ? `https://t.me/${tg}` : '',
    instagram: ig ? `@${ig}` : '',
    instagramHref: ig ? `https://instagram.com/${ig}` : '',
    city: shop.contacts.city,
    address: shop.contacts.address,
    workHours: shop.contacts.workHours,
  })
}

/**
 * Saytni yaratgan platforma — «Yordam» sahifasidagi alohida blok.
 * Texnik savollar do'konga emas, platformaga tushadi.
 */
export const DEVELOPER = {
  name: PLATFORM.name,
  phone: PLATFORM.phone,
  phoneHref: PLATFORM.phoneHref,
  telegram: PLATFORM.telegram,
  telegramHref: PLATFORM.telegramHref,
  email: PLATFORM.email,
} as const

/** Fayl nomi uchun: «Kafe Nur» → «Kafe-Nur». */
export function fileSafe(name: string): string {
  return name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'dokon'
}

/** Do'kon botiga havola (Telegram ulangan bo'lsa). */
export function botUrl(): string {
  return BRAND.botUsername ? `https://t.me/${BRAND.botUsername}` : ''
}
