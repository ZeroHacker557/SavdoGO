import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyInitData } from './_lib/telegram-auth.js'
import { adminAuth } from './_lib/firebase-admin.js'
import { fail, requirePost } from './_lib/http.js'
import { courierByTelegram } from './_lib/courier-staff.js'
import { loadShopContext, shopCol, withShop } from './_lib/context.js'
import { shopIdFrom } from './_lib/tenant.js'

/**
 * POST /api/auth   { initData: string, shopId: string }
 * → { token: string }
 *
 * Faqat Telegram mini app uchun (qo'shimcha xizmat). Brauzerdagi mijoz
 * bu yerdan o'tmaydi — u Firebase anonim hisobi bilan kiradi.
 *
 * Har do'konning o'z boti bor: initData imzosi O'SHA do'kon botining
 * tokeni bilan tekshiriladi, keyin Firebase Custom Token qaytariladi.
 * uid — Telegram id (bir odam bir necha do'konda bo'lsa ham bitta uid,
 * lekin profil har do'konda alohida: shops/{id}/users/{uid}).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  const shopId = shopIdFrom(req.body, req.headers)
  const context = shopId ? await loadShopContext(shopId).catch(() => null) : null
  if (!context) return fail(res, 404, 'Do‘kon topilmadi')
  if (!context.botToken) return fail(res, 400, 'Bu do‘konga Telegram bot ulanmagan')

  const initData = typeof req.body?.initData === 'string' ? req.body.initData : ''

  let user
  try {
    user = verifyInitData(initData, context.botToken)
  } catch (error) {
    return fail(res, 401, error instanceof Error ? error.message : 'Tekshiruv xatosi')
  }

  const uid = String(user.id)

  try {
    return await withShop(context, async () => {
      /*
       * Kuryermi — mini app shu belgiga qarab kuryer sahifasini ochadi.
       * Har kirishda qayta tekshiriladi: admin kuryerni qo'shgan yoki
       * olib tashlagan bo'lsa, ilova keyingi ochilishda to'g'ri sahifaga
       * tushadi (panel belgini darhol ham yangilaydi — people.ts).
       */
      const courier = Boolean(await courierByTelegram(user.id))

      // Profil ma'lumotini serverda yangilaymiz — mijozga ishonmaymiz
      await (await shopCol('users')).doc(uid).set(
        {
          id: user.id,
          uid,
          telegramId: user.id,
          courier,
          first_name: user.first_name,
          last_name: user.last_name ?? null,
          username: user.username ?? null,
          photo_url: user.photo_url ?? null,
          lastActive: new Date().toISOString(),
        },
        { merge: true },
      )

      const token = await (await adminAuth()).createCustomToken(uid, { telegramId: user.id })
      return res.status(200).json({ token })
    })
  } catch (error) {
    console.error('[auth] xato:', error)
    return fail(res, 500, 'Autentifikatsiya amalga oshmadi')
  }
}
