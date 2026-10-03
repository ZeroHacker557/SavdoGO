import { createContext, useContext } from 'react'
import type { ShopConfig } from '../platform/shop'

export const ShopContext = createContext<ShopConfig | null>(null)

/**
 * Joriy do'kon — komponentlar uchun. Admin sozlamani o'zgartirsa
 * (rang, yetkazish narxi, to'lov holati) sahifa o'zi yangilanadi:
 * do'kon hujjati jonli kuzatiladi (src/storefront-entry.tsx).
 */
export function useShop(): ShopConfig {
  const shop = useContext(ShopContext)
  if (!shop) throw new Error('useShop() ShopProvider ichida chaqirilishi kerak')
  return shop
}
