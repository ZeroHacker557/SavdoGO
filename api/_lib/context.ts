import { AsyncLocalStorage } from 'node:async_hooks'
import type { CollectionReference, DocumentReference } from 'firebase-admin/firestore'
import { adminDb } from './firebase-admin.js'

/**
 * So'rov davomidagi «joriy do'kon».
 *
 * Shablon kodi bitta do'kon uchun yozilgan edi: `db.collection('orders')`,
 * `sendMessage(...)` (bitta BOT_TOKEN). Endi har so'rov boshida router
 * do'konni aniqlaydi va `withShop()` ichida ishlaydi — shu tufayli
 * chuqurdagi funksiyalar (xabar yuborish, qoldiqni ayirish, kuryer
 * tanlash...) do'kon identifikatorini parametr sifatida olib yurmaydi:
 *
 *   await shopCol('orders')        → shops/{joriy}/orders
 *   sendMessage(...)               → joriy do'konning boti
 *
 * Kontekstsiz chaqirilsa xato tashlaydi — bir do'kon ma'lumoti boshqasiga
 * tasodifan yozilib qolmasligi uchun jim «standart» qiymat yo'q.
 */
export type ShopContext = {
  shopId: string
  shopName: string
  /** Do'konning Telegram boti (qo'shimcha xizmat). Ulanmagan bo'lsa null. */
  botToken: string | null
  botUsername: string | null
  /** O'z domeni (masalan kafenur.uz). Bo'lmasa subdomen ishlatiladi. */
  customDomain: string | null
}

const storage = new AsyncLocalStorage<ShopContext>()

export function withShop<T>(context: ShopContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn)
}

export function currentShop(): ShopContext {
  const context = storage.getStore()
  if (!context) throw new Error('Do‘kon konteksti o‘rnatilmagan')
  return context
}

/** Joriy do'kon ichida ishlayaptimi (xabar yuboruvchi kabi ixtiyoriy joylar uchun). */
export function hasShop(): boolean {
  return storage.getStore() !== undefined
}

export async function shopDoc(): Promise<DocumentReference> {
  return (await adminDb()).collection('shops').doc(currentShop().shopId)
}

export async function shopCol(name: string): Promise<CollectionReference> {
  return (await shopDoc()).collection(name)
}

/**
 * Do'kon kontekstini bazadan yig'adi: nomi va Telegram bot ma'lumoti.
 * Bot tokeni ommaviy hujjatda emas — `shopSecrets/{id}` da (Rules uni
 * brauzerga bermaydi).
 */
export async function loadShopContext(shopId: string): Promise<ShopContext | null> {
  const db = await adminDb()
  const [shop, secrets] = await Promise.all([
    db.collection('shops').doc(shopId).get(),
    db.collection('shopSecrets').doc(shopId).get(),
  ])
  if (!shop.exists) return null
  const data = shop.data() ?? {}
  return {
    shopId,
    shopName: String(data.name || shopId),
    botToken: secrets.exists ? String(secrets.data()?.botToken || '') || null : null,
    botUsername: data.botUsername ? String(data.botUsername) : null,
    customDomain: data.customDomain ? String(data.customDomain) : null,
  }
}
