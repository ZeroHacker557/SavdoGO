import type { VercelRequest, VercelResponse } from '@vercel/node'
import { atLeast, requireStaff, staffFromBot, type Staff } from '../_lib/admin-auth.js'
import { fail, requirePost } from '../_lib/http.js'
import { orderAssign, orderStatus } from '../_lib/actions/orders.js'
import {
  categoryDelete, categorySave, orderSave, productBulkUpdate, productDelete, productSave,
  promoDelete, promoSave, requireCatalogAccess,
} from '../_lib/actions/catalog.js'
import { broadcast, broadcastChannels, staffDelete, staffLinkTelegram, staffSave } from '../_lib/actions/people.js'
import { catalogLayout, sectionDelete, sectionSave } from '../_lib/actions/sections.js'
import { promotionDelete, promotionSave } from '../_lib/actions/promotions.js'
import { adSave } from '../_lib/actions/ads.js'
import { settingsSave, settingsTestGroup } from '../_lib/actions/settings.js'
import { courierDeliver, courierTake } from '../_lib/actions/courier.js'
import { supportAdminRead, supportClose, supportReply } from '../_lib/actions/support.js'
import { cashConfirm, cashReject } from '../_lib/actions/cash.js'
import { demoCleanup } from '../_lib/actions/demo.js'
import { botConnect, botDisconnect } from '../_lib/actions/bot.js'
import { accountLoginLink, accountSync } from '../_lib/actions/account.js'
import { loadShopContext, withShop } from '../_lib/context.js'
import { adminDb } from '../_lib/firebase-admin.js'
import { PaymentRequiredError, isShopActive, readShopState } from '../_lib/tenant.js'

type Body = Record<string, unknown>

function requireSupportAccess(staff: Staff) {
  if (!atLeast(staff.role, 'admin')) throw new Error('Murojaatlarga faqat admin javob beradi')
}
type Handler = (staff: Staff, body: Body) => Promise<unknown>

/**
 * Admin panelning YAGONA yozuv nuqtasi: POST /api/admin/action
 * Tana: { action: "product.save", ...maydonlar }
 *
 * Nega bitta funksiya? Vercel Hobby rejasida serverless funksiyalar soni
 * cheklangan (12 ta), har amal uchun alohida fayl ochilsa limit tez
 * tugaydi. Mantiq esa `api/_lib/actions/` ichidagi alohida modullarda —
 * bu fayl faqat yo'naltiradi va huquqni tekshiradi.
 */
const HANDLERS: Record<string, Handler> = {
  // Buyurtmalar — kuryer ham chaqira oladi, cheklovlar modul ichida
  'order.status': orderStatus,
  'order.assign': orderAssign,
  // Botdagi eski «Oldim / Yetkazdim» tugmalari — mini app bilan bir xil yo'l
  'courier.take': courierTake,
  'courier.deliver': courierDeliver,

  // Katalog — kuryerga yopiq
  'product.save': (staff, body) => (requireCatalogAccess(staff), productSave(body)),
  'product.delete': (staff, body) => (requireCatalogAccess(staff), productDelete(body)),
  'product.bulkUpdate': (staff, body) => (requireCatalogAccess(staff), productBulkUpdate(body)),
  'promotion.save': (staff, body) => (requireCatalogAccess(staff), promotionSave(body)),
  'promotion.delete': (staff, body) => (requireCatalogAccess(staff), promotionDelete(body)),
  'ad.save': (staff, body) => (requireCatalogAccess(staff), adSave(body)),
  'category.save': (staff, body) => (requireCatalogAccess(staff), categorySave(body)),
  'category.delete': (staff, body) => (requireCatalogAccess(staff), categoryDelete(body)),
  'promo.save': (staff, body) => (requireCatalogAccess(staff), promoSave(body)),
  'promo.delete': (staff, body) => (requireCatalogAccess(staff), promoDelete(body)),
  'order.sort': (staff, body) => (requireCatalogAccess(staff), orderSave(body)),
  'section.save': (staff, body) => (requireCatalogAccess(staff), sectionSave(body)),
  'section.delete': (staff, body) => (requireCatalogAccess(staff), sectionDelete(body)),
  'catalog.layout': (staff, body) => (requireCatalogAccess(staff), catalogLayout(body)),

  // Odamlar
  'staff.save': staffSave,
  // Panel Telegram ichida ochilganda xodim o'z ID sini biriktiradi
  'staff.linkTelegram': staffLinkTelegram,
  'staff.delete': staffDelete,
  'broadcast.send': broadcast,
  'broadcast.channels': broadcastChannels,

  // Kuryerlar bilan qo'llab-quvvatlash chati — javobni admin beradi
  'support.reply': (staff, body) => (requireSupportAccess(staff), supportReply(staff, body)),
  'support.read': (staff, body) => (requireSupportAccess(staff), supportAdminRead(staff, body)),
  'support.close': (staff, body) => (requireSupportAccess(staff), supportClose(staff, body)),

  // Kuryerlar kassasi — naqd pulni qabul qilish
  'cash.confirm': (staff, body) => (requireSupportAccess(staff), cashConfirm(staff, body)),
  'cash.reject': (staff, body) => (requireSupportAccess(staff), cashReject(staff, body)),

  // Sozlamalar
  'settings.save': settingsSave,
  'settings.testGroup': settingsTestGroup,

  // «Hisobim»: zaxira kirish usullari (Google, email)
  'account.sync': (staff) => accountSync(staff),
  'account.loginLink': (staff) => accountLoginLink(staff),

  // O'z Telegram botini ulash (bepul) — faqat ega
  'bot.connect': botConnect,
  'bot.disconnect': botDisconnect,

  // Namuna (demo) mahsulot va kategoriyalarni bir bosishda o'chirish
  'demo.cleanup': (staff, body) => (requireCatalogAccess(staff), demoCleanup(body)),
}

/**
 * To'lovgacha ham bajariladigan amallar. Qolgan HAMMASI to'lov talab
 * qiladi — ro'yxat oq ro'yxat (whitelist): yangi amal qo'shilsa, u
 * sukut bo'yicha qulflangan bo'ladi.
 */
const FREE_ACTIONS = new Set(['staff.linkTelegram', 'bot.connect', 'bot.disconnect', 'account.sync', 'account.loginLink'])

/**
 * Do'konning o'z Telegram boti bilan ishlaydigan amallar (bot ulash bepul).
 * Bot ulanmagan bo'lsa (shopSecrets'da token yo'q) rad etiladi —
 * panel bu bo'limlarni yashiradi, bu esa to'g'ridan-to'g'ri so'rovdan himoya.
 */
const ADDON_ACTIONS = new Set([
  'order.assign', 'courier.take', 'courier.deliver',
  'support.reply', 'support.read', 'support.close',
  'cash.confirm', 'cash.reject',
  'broadcast.send', 'broadcast.channels', 'settings.testGroup',
])

function needsAddon(action: string, body: Body): boolean {
  if (ADDON_ACTIONS.has(action)) return true
  if (action === 'settings.save' && body.section === 'courier') return true
  // Kuryer (yoki «kuryer sifatida ham ishlaydi») faqat to'plam bilan
  if (action === 'staff.save' && (body.role === 'courier' || body.canDeliver === true)) return true
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  /*
   * Ikki xil kiruvchi bor:
   *   1. Admin panel — `Authorization: Bearer <Firebase ID token>`
   *   2. Telegram bot — `x-bot-*` sarlavhalari bilan imzolangan so'rov
   *
   * Ikkinchisi kerak, chunki admin botdagi «Qabul qilindi» tugmasini
   * bossa ham buyurtma xuddi paneldagidek qayta ishlanishi kerak:
   * holat, tarix, kuryerga yuborish, mijozga xabar. Mantiqni botda
   * qayta yozish o'rniga bot shu funksiyani chaqiradi.
   *
   * Eng past rol bilan kiritamiz — har amal o'z cheklovini o'zi qo'yadi.
   */
  const fromBot = await staffFromBot(req, res)
  if (fromBot === null) return

  const staff = fromBot ?? (await requireStaff(req, res, 'courier'))
  if (!staff) return

  // Bot orqali faqat buyurtma holati o'zgartiriladi: admin — tasdiqlash,
  // kuryer — eski xabarlardagi «Oldim / Yetkazdim». Xodim qo'shish,
  // ommaviy xabar va sozlamalar — faqat panelda, haqiqiy seans bilan.
  if (fromBot) {
    const action = typeof req.body?.action === 'string' ? req.body.action : ''
    if (action === 'courier.take' || action === 'courier.deliver') {
      // Kuryer cheklovi amalning o'zida (requireCourier)
    } else if (action !== 'order.status') {
      return fail(res, 403, 'Bu amal bot orqali bajarilmaydi')
    } else if (!atLeast(staff.role, 'admin')) {
      return fail(res, 403, 'Buyurtmani faqat admin tasdiqlaydi')
    }
  }

  const action = typeof req.body?.action === 'string' ? req.body.action : ''
  const run = HANDLERS[action]
  if (!run) return fail(res, 400, `Noma’lum amal: ${action || '(bo‘sh)'}`)

  try {
    // Hamma amal xodimning O'Z do'koni ichida (context.ts)
    const context = await loadShopContext(staff.shopId)
    if (!context) return fail(res, 404, 'Do‘kon topilmadi')

    // To'lanmagan yoki muddati tugagan do'kon — faqat ko'rish rejimi.
    // Dizayn va aloqa bundan mustasno: ega saytni to'lovdan oldin sozlab olsin
    const free = FREE_ACTIONS.has(action) || (action === 'settings.save' && req.body?.section === 'brand')
    if (!free) {
      const state = await readShopState(await adminDb(), staff.shopId)
      if (state.status === 'blocked') return fail(res, 403, 'Do‘kon vaqtincha to‘xtatilgan. Biz bilan bog‘laning.', 'shop-blocked')
      if (!isShopActive(state)) throw new PaymentRequiredError()
    }

    if (needsAddon(action, (req.body ?? {}) as Body) && !context.botToken) {
      return fail(
        res,
        403,
        'Bu imkoniyat do‘koningizning Telegram boti bilan ishlaydi. «Kuryerlar va Telegram» bo‘limida botingizni bepul ulang.',
        'addon-required',
      )
    }

    const result = await withShop(context, () => run(staff, (req.body ?? {}) as Body))
    return res.status(200).json({ ok: true, ...(result as object) })
  } catch (error) {
    if (error instanceof PaymentRequiredError) return fail(res, 402, error.message, error.code)
    const message = error instanceof Error ? error.message : 'Amal bajarilmadi'
    console.error(`[admin] ${action} xatosi:`, error)
    // Tekshiruv xatolari mijozga tushunarli matn bilan qaytadi
    return fail(res, 400, message)
  }
}
