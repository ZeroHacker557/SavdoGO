import { applyBrand } from '../config/brand'
import { canTakeOrders, type ShopConfig } from '../platform/shop'

/**
 * Sahifa ko'rsatayotgan do'kon — bitta sahifa, bitta do'kon.
 *
 * `src/storefront-entry.tsx` sayt ochilishida do'konni topadi va shu
 * yerga yozadi. React bo'lmagan modullar (Firestore yo'llari, API
 * so'rovlari) do'kon identifikatorini shu yerdan oladi; komponentlar
 * esa `useShop()` (context.tsx) orqali — u holat o'zgarsa (masalan
 * to'lov tasdiqlansa) qayta chiziladi.
 */
let current: ShopConfig | null = null
let preview = false
const listeners = new Set<(shop: ShopConfig) => void>()

export function setActiveShop(shop: ShopConfig, options: { preview?: boolean } = {}) {
  current = shop
  if (options.preview !== undefined) preview = options.preview
  applyBrand(shop)
  listeners.forEach((listener) => listener(shop))
}

export function activeShop(): ShopConfig {
  if (!current) throw new Error('Do‘kon hali yuklanmagan')
  return current
}

export function activeShopId(): string {
  return activeShop().id
}

/**
 * Oldindan ko'rish: ro'yxatdan o'tish formasidagi qoralama. Bazaga
 * umuman murojaat qilinmaydi — katalog biznes turining namunasidan.
 */
export function isPreview(): boolean {
  return preview
}

/** Mijoz hozir buyurtma bera oladimi (to'langan, muddati o'tmagan, qoralama emas). */
export function acceptsOrders(): boolean {
  return !preview && current !== null && canTakeOrders(current)
}

export function onShopChange(listener: (shop: ShopConfig) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
