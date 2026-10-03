import type { CollectionReference, DocumentReference, Firestore } from 'firebase-admin/firestore'

/**
 * Ko'p do'konli (multi-tenant) ma'lumot tuzilmasi.
 *
 *   shops/{shopId}                  — do'konning ommaviy hujjati
 *   shops/{shopId}/products/{id}    — katalog, buyurtmalar, mijozlar...
 *   shopPrivate/{shopId}            — egasining maxfiy ma'lumoti
 *   staff/{uid}                     — xodim (shopId maydoni bilan)
 *   payments/{id}                   — obuna to'lovlari (super-admin tasdiqlaydi)
 *   domains/{host}                  — o'z domeni → shopId
 *   platform/settings               — platforma kartasi va sozlamalari
 *
 * Shablondagi `db.collection('products')` endi `shop.col('products')`.
 * DocumentReference ham `.collection()` ga ega, shuning uchun qolgan
 * kod (`.doc()`, `.where()`, tranzaksiyalar) o'zgarmaydi.
 */
export type ShopScope = {
  id: string
  ref: DocumentReference
  col: (name: string) => CollectionReference
}

export function shopScope(db: Firestore, shopId: string): ShopScope {
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(shopId)) throw new Error('Do‘kon identifikatori noto‘g‘ri')
  const ref = db.collection('shops').doc(shopId)
  return { id: shopId, ref, col: (name) => ref.collection(name) }
}

export type ShopStatus = 'demo' | 'active' | 'expired' | 'blocked'

export type ShopState = {
  exists: boolean
  status: ShopStatus
  paidUntil: string | null
  name: string
  botToken?: string | null
}

/** Do'kon holati: ochiqmi, to'langanmi. */
export async function readShopState(db: Firestore, shopId: string): Promise<ShopState> {
  const snap = await db.collection('shops').doc(shopId).get()
  if (!snap.exists) return { exists: false, status: 'blocked', paidUntil: null, name: '' }
  const data = snap.data() ?? {}
  const status = String(data.status || 'demo') as ShopStatus
  return {
    exists: true,
    status: ['demo', 'active', 'expired', 'blocked'].includes(status) ? status : 'demo',
    paidUntil: typeof data.paidUntil === 'string' ? data.paidUntil : null,
    name: String(data.name || shopId),
  }
}

/** To'lov qilingan va muddati tugamaganmi. */
export function isShopActive(state: ShopState, now = Date.now()): boolean {
  if (!state.exists || state.status !== 'active') return false
  return !state.paidUntil || new Date(state.paidUntil).getTime() > now
}

/**
 * To'lov qilinmagan do'konda amal bajarilganda tashlanadigan xato.
 * Router uni 402 + `payment-required` kodiga aylantiradi, admin panel
 * esa «To'lov qiling» oynasini ochadi.
 */
export class PaymentRequiredError extends Error {
  readonly code = 'payment-required'
  readonly status = 402
  constructor(message = 'Bu amal to‘lovdan keyin ochiladi. Admin paneldagi «Obuna va to‘lov» bo‘limidan tarifni faollashtiring.') {
    super(message)
    this.name = 'PaymentRequiredError'
  }
}

export async function requireActiveShop(db: Firestore, shopId: string): Promise<ShopState> {
  const state = await readShopState(db, shopId)
  if (!state.exists) throw new Error('Do‘kon topilmadi')
  if (state.status === 'blocked') throw new Error('Do‘kon vaqtincha to‘xtatilgan')
  if (!isShopActive(state)) throw new PaymentRequiredError()
  return state
}

/** So'rovdagi do'kon identifikatori: body.shopId yoki `x-shop-id` sarlavhasi. */
export function shopIdFrom(body: unknown, headers: Record<string, string | string[] | undefined>): string {
  const fromBody = (body as { shopId?: unknown } | undefined)?.shopId
  const raw = typeof fromBody === 'string' ? fromBody : String(headers['x-shop-id'] || '')
  return raw.trim().toLowerCase()
}
