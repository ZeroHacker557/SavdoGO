import { apiPost } from './api'
import { auth } from './auth'

/**
 * Hisobning do'konlari va ular orasida almashtirish.
 *
 * Bitta ega — bitta do'kon, lekin ikkinchi do'kon arizasi tasdiqlansa,
 * yangi do'kon O'SHA hisobga qo'shiladi (api/_lib/platform/owners.ts).
 * Panel bir paytda bitta — «faol» do'konni boshqaradi; almashtirish
 * serverda faol do'konni o'zgartiradi, keyin token yangilanib, panel
 * qaytadan yuklanadi (hamma jonli obunalar yangi do'konga ulanadi).
 */
export type OwnedShop = {
  id: string
  name: string
  status: string
  logo: string | null
  brand: string
  role: string
  current: boolean
}

let owned: OwnedShop[] = []

/** Sessiya javobidan (api/admin/session.ts) bir marta yoziladi. */
export function setOwnedShops(list: OwnedShop[] | undefined) {
  owned = Array.isArray(list) ? list : []
}

export function ownedShops(): OwnedShop[] {
  return owned
}

export async function switchToShop(shopId: string) {
  await apiPost('/api/platform', { action: 'owner.switch', shopId })
  await auth.currentUser?.getIdToken(true)
  window.location.hash = '#/dashboard'
  window.location.reload()
}

export const SHOP_STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  active: { label: 'Faol', fg: 'var(--success)', bg: 'var(--success-soft)' },
  trial: { label: 'Bepul sinov', fg: 'var(--brand)', bg: 'var(--brand-soft)' },
  demo: { label: 'Ko‘rish rejimi', fg: 'var(--muted)', bg: 'var(--surface-3)' },
  blocked: { label: 'To‘xtatilgan', fg: 'var(--danger)', bg: 'var(--danger-soft)' },
}
