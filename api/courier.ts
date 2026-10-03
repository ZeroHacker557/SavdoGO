import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fail, requirePost } from './_lib/http.js'
import {
  courierArrived, courierDeliver, courierOverview, courierProblem, courierShift, courierTake,
} from './_lib/actions/courier.js'
import { courierCashHandover } from './_lib/actions/cash.js'
import { courierLocation } from './_lib/actions/location.js'
import { supportCourierRead, supportOpen, supportSend } from './_lib/actions/support.js'
import { courierByTelegram } from './_lib/courier-staff.js'
import { errorCode } from './_lib/errors.js'
import { withShop } from './_lib/context.js'
import { customerRequest } from './_lib/customer.js'

/**
 * POST /api/courier   { action: "overview" | "take" | "deliver" | "support.*", … }
 * Authorization: Bearer <Firebase ID token>
 *
 * Mini app'dagi kuryer sahifasi. Kuryer ilovaga Telegram orqali kiradi
 * (api/auth.ts), shuning uchun token uid'i — uning Telegram ID si.
 * Kuryer sahifasi faqat Telegram qo'shimcha xizmati ulangan do'konda bor.
 * Kuryerligi har so'rovda `staff` dan tekshiriladi: admin kuryerni
 * bloklasa, keyingi so'rovdayoq rad etiladi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  const who = await customerRequest(req, res)
  if (!who) return

  return withShop(who.context, () => run(req, res, who.uid))
}

async function run(req: VercelRequest, res: VercelResponse, uid: string) {
  // Kuryer — Telegram orqali kirgan xodim; brauzerdagi anonim hisob kuryer bo'la olmaydi
  const courier = /^\d+$/.test(uid) ? await courierByTelegram(Number(uid)) : null
  if (!courier) return fail(res, 403, 'Siz kuryer emassiz yoki hisobingiz faol emas', 'NOT_COURIER')

  const body = (req.body ?? {}) as Record<string, unknown>
  const action = typeof body.action === 'string' ? body.action : ''

  try {
    let result: object
    if (action === 'overview') result = await courierOverview(courier)
    else if (action === 'take') result = await courierTake(courier, body)
    else if (action === 'deliver') result = await courierDeliver(courier, body)
    else if (action === 'arrived') result = await courierArrived(courier, body)
    else if (action === 'shift') result = await courierShift(courier, body)
    else if (action === 'problem') result = await courierProblem(courier, body)
    else if (action === 'cash.handover') result = await courierCashHandover(courier)
    // Mini app ochiq turganda — admin xaritasi va mijoz kuzatuvi uchun
    else if (action === 'location') result = await courierLocation(courier, body)
    // Qo'llab-quvvatlash chati — o'qish ilovada jonli, yozish shu yerda
    else if (action === 'support.open') result = await supportOpen(courier, body)
    else if (action === 'support.send') result = await supportSend(courier, body)
    else if (action === 'support.read') result = await supportCourierRead(courier, body)
    else return fail(res, 400, `Noma’lum amal: ${action || '(bo‘sh)'}`, 'UNKNOWN_ACTION')

    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error(`[courier] ${action} xatosi:`, error)
    // Kod bo'lsa ilova xatoni kuryerning tilida ko'rsatadi (api/_lib/errors.ts)
    return fail(res, 400, error instanceof Error ? error.message : 'Amal bajarilmadi', errorCode(error))
  }
}
