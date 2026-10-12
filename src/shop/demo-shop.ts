import { businessType } from '../platform/business-types'
import { PLATFORM } from '../platform/config'
import { draftToConfig, emptyDraft, type ShopConfig } from '../platform/shop'

/**
 * Landingdagi «Demo do'kon» (`/?demo`) — hammaga bir xil namuna do'kon.
 *
 * Oldindan ko'rish rejimining o'zi: bazaga murojaat yo'q, katalog
 * biznes turining namunasidan (demo-catalog.ts), buyurtma serverga
 * ketmaydi. Farqi — qoralama o'rniga shu tayyor sozlama va tepada
 * «O'zimnikini ochish» qatori (ShopBanner).
 *
 * Aloqa tugmalari SavdoGO'ning o'ziga olib boradi: demo'dan qo'ng'iroq
 * qilgan odam — bo'lajak mijoz.
 */
export function demoShopConfig(): ShopConfig {
  const type = businessType('restaurant')
  const base = emptyDraft(type.id)
  return draftToConfig(
    {
      ...base,
      slug: 'demo',
      name: 'Kafe Nur',
      tagline: 'Milliy va Yevropa taomlari',
      contacts: {
        phone: PLATFORM.phone,
        telegram: PLATFORM.telegram,
        instagram: '',
        city: 'Toshkent',
        address: 'Namuna manzil',
        workHours: '09:00 — 23:00',
      },
    },
    { id: 'demo' },
  )
}
