import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { applyBrand } from '../../config/brand'
import { applyShopTheme } from '../../platform/palette'
import { businessType } from '../../platform/business-types'
import { canTakeOrders, readShopConfig, type ShopConfig } from '../../platform/shop'
import { db } from './auth'

/**
 * Admin panel qaysi do'konni boshqaryapti.
 *
 * Xodim bitta do'konga tegishli (staffIndex/{uid}); server sessiya
 * javobida do'kon hujjatini beradi (api/admin/session.ts). Shundan
 * keyin hamma Firestore yo'llari `shops/{id}/...` ichida (live.ts) va
 * panel do'konning logosi va ranglarida chiziladi.
 *
 * Do'kon hujjati jonli kuzatiladi: platforma egasi to'lovni tasdiqlasa
 * «ko'rish rejimi» qulfi sahifani yangilamasdan ochiladi.
 */
let current: ShopConfig | null = null
const listeners = new Set<(shop: ShopConfig) => void>()
let stopWatch: (() => void) | null = null

function apply(shop: ShopConfig) {
  current = shop
  applyBrand(shop)
  applyShopTheme(shop.theme)
  listeners.forEach((listener) => listener(shop))
}

export function setAdminShop(id: string, raw: Record<string, unknown>) {
  apply(readShopConfig(id, raw))
  stopWatch?.()
  stopWatch = onSnapshot(
    doc(db, 'shops', id),
    (snap) => {
      if (snap.exists()) apply(readShopConfig(snap.id, snap.data()))
    },
    (error) => console.warn('[admin] do‘kon hujjati kuzatilmadi:', error),
  )
}

export function adminShop(): ShopConfig {
  if (!current) throw new Error('Do‘kon hali yuklanmagan')
  return current
}

export function adminShopId(): string {
  return adminShop().id
}

export function useAdminShop(): ShopConfig {
  const [shop, setShop] = useState(adminShop)
  useEffect(() => {
    listeners.add(setShop)
    return () => {
      listeners.delete(setShop)
    }
  }, [])
  return shop
}

/** To'lanmagan yoki muddati tugagan — faqat ko'rish rejimi. */
export function isLocked(shop: ShopConfig = adminShop()): boolean {
  return !canTakeOrders(shop)
}

/** Biznes turining atamalari — mahsulot formasidagi yorliqlar uchun. */
export function shopTerms() {
  return businessType(adminShop().type)
}

/** Obuna necha kundan keyin tugaydi (faol bo'lsa). */
export function daysLeft(shop: ShopConfig): number | null {
  if (shop.status !== 'active' || !shop.paidUntil) return null
  return Math.ceil((new Date(shop.paidUntil).getTime() - Date.now()) / 86_400_000)
}
