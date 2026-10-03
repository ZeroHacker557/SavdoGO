import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fail, requirePost } from './_lib/http.js'
import { shopCol, withShop } from './_lib/context.js'
import { customerRequest } from './_lib/customer.js'

/**
 * POST /api/promo   { code: string, subtotal: number }
 * Authorization: Bearer <Firebase ID token>
 * → { code, discountPercent, discount, total }
 *
 * Faqat OLDINDAN KO'RSATISH uchun. Haqiqiy chegirma buyurtma
 * yaratilayotganda /api/orders ichida qaytadan tekshiriladi —
 * bu javobga ishonib qolinmaydi (F-18).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  const who = await customerRequest(req, res)
  if (!who) return
  const { uid } = who

  const code = String(req.body?.code || '').trim().toUpperCase().slice(0, 40)
  const subtotal = Math.max(Math.floor(Number(req.body?.subtotal) || 0), 0)
  if (!code) return fail(res, 400, 'Promokod kiritilmagan', 'PROMO_EMPTY')

  try {
    const snap = await withShop(who.context, async () => (await shopCol('promocodes'))
      .where('code', '==', code)
      .limit(1)
      .get())

    if (snap.empty) return fail(res, 404, 'Bunday promokod topilmadi', 'PROMO_NOT_FOUND')

    const promo = snap.docs[0].data()

    if (promo.active === false) return fail(res, 400, 'Promokod faol emas', 'PROMO_INACTIVE')

    const expiresAt = promo.expiresAt ? Date.parse(String(promo.expiresAt)) : NaN
    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return fail(res, 400, 'Promokod muddati tugagan', 'PROMO_EXPIRED')
    }

    const maxUses = Number(promo.maxUses)
    const usageCount = Number(promo.usageCount) || 0
    if (Number.isFinite(maxUses) && maxUses > 0 && usageCount >= maxUses) {
      return fail(res, 400, 'Promokoddan foydalanish chegarasi tugagan', 'PROMO_USED_UP')
    }

    const usedBy: unknown[] = Array.isArray(promo.usedBy) ? promo.usedBy : []
    if (usedBy.includes(uid) || (/^\d+$/.test(uid) && usedBy.includes(Number(uid)))) {
      return fail(res, 400, 'Siz bu promokoddan allaqachon foydalangansiz', 'PROMO_ALREADY_USED')
    }

    const minOrderTotal = Number(promo.minOrderTotal) || 0
    if (subtotal < minOrderTotal) {
      return fail(
        res,
        400,
        `Bu promokod ${minOrderTotal.toLocaleString('uz-UZ')} so'mdan yuqori buyurtmalar uchun`,
        'PROMO_MIN_TOTAL',
        { amount: minOrderTotal },
      )
    }

    const discountPercent = Math.min(Math.max(Number(promo.discountPercent) || 0, 0), 100)
    const discount = Math.round((subtotal * discountPercent) / 100)

    return res.status(200).json({
      code: String(promo.code || code),
      discountPercent,
      discount,
      total: Math.max(subtotal - discount, 0),
    })
  } catch (error) {
    console.error('[promo] xato:', error)
    return fail(res, 500, "Promokodni tekshirib bo'lmadi")
  }
}
