import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth } from './firebase-admin.js'
import { fail } from './http.js'
import { loadShopContext, type ShopContext } from './context.js'
import { shopIdFrom } from './tenant.js'

/**
 * Xaridor so'rovi: kim (Firebase uid) va qaysi do'kon.
 *
 * Brauzerda — anonim hisob (uid tasodifiy), Telegram'da — Telegram id.
 * Do'kon `x-shop-id` sarlavhasi yoki `shopId` maydonidan olinadi va
 * bazadan tekshiriladi. Xato bo'lsa javobni o'zi yozadi va null qaytaradi.
 */
export async function customerRequest(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ uid: string; context: ShopContext } | null> {
  const header = String(req.headers.authorization || '')
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) {
    fail(res, 401, 'Avtorizatsiya talab qilinadi')
    return null
  }

  let uid: string
  try {
    uid = (await (await adminAuth()).verifyIdToken(idToken)).uid
  } catch {
    fail(res, 401, 'Sessiya eskirgan, sahifani yangilang')
    return null
  }

  const shopId = shopIdFrom(req.body, req.headers)
  const context = shopId ? await loadShopContext(shopId).catch(() => null) : null
  if (!context) {
    fail(res, 404, 'Do‘kon topilmadi', 'SHOP_NOT_FOUND')
    return null
  }
  return { uid, context }
}

/** Mijozning ko'rinadigan ismi: brauzerda — buyurtmadagi ism, Telegram'da — profil. */
export function customerName(data: Record<string, unknown>): string {
  const own = String(data.name || '').trim()
  if (own) return own
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || 'Mijoz'
}
