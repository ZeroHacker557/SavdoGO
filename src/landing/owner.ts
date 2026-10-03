import { useEffect, useState } from 'react'
import { forgetOwnerShop, ownerShopMarker } from '../platform/owner-marker'

/**
 * Landingni do'kon egasi ochganmi — o'z do'konini darhol ko'rsin.
 *
 * Arzon: oddiy mehmonda hech narsa yuklanmaydi va Firestore'ga
 * murojaat yo'q. Faqat shu qurilmada do'kon ochilgan yoki ega admin
 * panelga kirgan bo'lsa (platform/owner-marker.ts) — Firebase seansi
 * tekshiriladi va do'konning ommaviy hujjati bir marta o'qiladi
 * (holati va obuna muddati uchun).
 */
export type OwnerShop = {
  id: string
  name: string
  status: string
  paidUntil: string | null
  /** Bepul sinov davri (paidUntil — sinov tugaydigan kun). */
  trial: boolean
  logo: string | null
  brand: string
  /** Kirgan bo'lsa — egasining ismi (salomlashish uchun). */
  ownerName: string
  signedIn: boolean
}

type RestValue = { stringValue?: string; booleanValue?: boolean; mapValue?: { fields?: Record<string, RestValue> } }

/**
 * Do'konning ommaviy hujjati — Firestore REST orqali (o'qish hamma uchun
 * ochiq, firestore.rules). Butun Firestore SDK'ni (~100 KB) landingga
 * yuklamaslik uchun oddiy `fetch`.
 */
async function fetchShop(id: string): Promise<Record<string, RestValue> | null> {
  const { firebaseConfig } = await import('../config/firebase')
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/shops/${encodeURIComponent(id)}`
  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Firestore ${response.status}`)
  const body = (await response.json()) as { fields?: Record<string, RestValue> }
  return body.fields ?? {}
}

async function loadOwnerShop(): Promise<OwnerShop | null> {
  const marker = ownerShopMarker()
  if (!marker) return null
  const { currentStaffSession } = await import('./onboarding/session')
  const session = await currentStaffSession()
  const id = session?.role === 'owner' && session.shopId ? session.shopId : marker.slug
  const fields = await fetchShop(id)
  if (!fields) {
    // Do'kon o'chirilgan — eski belgi qolib, egani chalg'itmasin
    if (id === marker.slug) forgetOwnerShop()
    return null
  }
  const text = (key: string) => fields[key]?.stringValue ?? ''
  const logo = text('logo')
  return {
    id,
    name: text('name') || marker.name || id,
    status: text('status') || 'demo',
    paidUntil: text('paidUntil') || null,
    trial: fields.trial?.booleanValue === true,
    logo: logo && !logo.startsWith('data:') ? logo : null,
    brand: fields.theme?.mapValue?.fields?.brand?.stringValue || '#5B4CF5',
    ownerName: session?.role === 'owner' ? session.name : '',
    signedIn: Boolean(session),
  }
}

let cache: Promise<OwnerShop | null> | null = null

/** Navigatsiya va hero bir xil natijani oladi — so'rov bir marta. */
export function useOwnerShop(): OwnerShop | null {
  const [shop, setShop] = useState<OwnerShop | null>(null)
  useEffect(() => {
    let alive = true
    cache ??= loadOwnerShop().catch(() => null)
    void cache.then((result) => {
      if (alive) setShop(result)
    })
    return () => {
      alive = false
    }
  }, [])
  return shop
}

const DAY = 86_400_000

/** Holat yorlig'i: «Faol · 23 kun qoldi», «Ko'rish rejimi»... */
export function ownerStatus(shop: OwnerShop): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (shop.status === 'blocked') return { label: 'To‘xtatilgan', tone: 'bad' }
  if (shop.status === 'active') {
    if (!shop.paidUntil) return { label: 'Faol', tone: 'ok' }
    const days = Math.ceil((new Date(shop.paidUntil).getTime() - Date.now()) / DAY)
    if (days <= 0) return { label: shop.trial ? 'Bepul sinov tugadi' : 'Obuna muddati tugagan', tone: 'bad' }
    return { label: `${shop.trial ? 'Bepul sinov' : 'Faol'} · ${days} kun qoldi`, tone: days <= 3 ? 'warn' : 'ok' }
  }
  return { label: 'Ko‘rish rejimi — to‘lov kutilmoqda', tone: 'warn' }
}
