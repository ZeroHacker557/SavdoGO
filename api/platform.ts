import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fail, requirePost } from './_lib/http.js'
import { requireStaff } from './_lib/admin-auth.js'
import { PlatformError, shopCreate, slugCheck } from './_lib/platform/shops.js'
import { DraftError } from './_lib/platform/draft.js'
import { billingStatus, billingSubmit } from './_lib/platform/billing.js'
import {
  paymentApprove, paymentReject, requireSuper, settingsSave, shopDelete, shopUpdate, superOverview,
} from './_lib/platform/super.js'
import {
  inviteCheck, ownerOverview, requestApprove, requestCancel, requestReject, requestSubmit, switchShop,
} from './_lib/platform/owners.js'
import { tgMe } from './_lib/platform/tglogin.js'
import { broadcastAudience, broadcastLog, broadcastSend } from './_lib/platform/broadcast.js'
import { platformToken, setupPlatformBot } from './_lib/platform/tgbot.js'

type Body = Record<string, unknown>

/**
 * Platforma API'si — POST /api/platform { action, ... }
 *
 *   Ochiq (ro'yxatdan o'tish):
 *     slug.check        — subdomen bo'shmi
 *     shop.create       — yangi do'kon + ega hisobi + namuna katalog
 *                         (`telegram: initData` — SavdoGO botidan, parolsiz)
 *     tg.me             — forma Telegram ichida: ism, tasdiqlangan telefon
 *
 *   Do'kon egasi (Firebase ID token, staff/{uid}):
 *     billing.status    — holat, platforma kartasi, to'lovlar tarixi
 *     billing.submit    — to'lov cheki yuborish
 *     owner.overview    — hisobning do'konlari va ikkinchi do'kon arizalari
 *     owner.request.submit / owner.request.cancel — ariza
 *     owner.switch      — panelda boshqa do'konga o'tish
 *     invite.check      — tasdiqlangan ariza kodi (forma ochilganda)
 *
 *   Platforma egasi (`super: true` claim):
 *     super.overview, super.payment.approve, super.payment.reject,
 *     super.shop.update, super.shop.delete, super.settings.save,
 *     super.request.approve, super.request.reject,
 *     super.bot.setup   — SavdoGO boti webhook'i va tavsifi
 *     super.broadcast.audience / .send / .log — SavdoGO botida ommaviy xabar
 *
 * Bitta funksiya — Vercel Hobby rejasidagi funksiyalar limiti uchun.
 */
function clientIp(req: VercelRequest): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || String(req.socket?.remoteAddress || '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — sozlamalar diagnostikasi (avvalgi /api/ping; funksiyalar soni cheklangan)
  if (req.method === 'GET') return ping(res)
  if (!requirePost(req, res)) return
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Body
  const action = typeof body.action === 'string' ? body.action : ''

  try {
    switch (action) {
      case 'slug.check':
        return res.status(200).json(await slugCheck(body))
      case 'shop.create':
        // Tasdiqlangan ariza bilan yaratilsa — egasining tokeni ham keladi
        return res.status(200).json(await shopCreate(body, clientIp(req), String(req.headers.authorization || '')))
      case 'tg.me':
        return res.status(200).json(await tgMe(body))
      case 'invite.check':
        return res.status(200).json(await inviteCheck(String(req.headers.authorization || ''), body))

      case 'owner.overview':
      case 'owner.request.submit':
      case 'owner.request.cancel': {
        const staff = await requireStaff(req, res, 'owner')
        if (!staff) return
        const result =
          action === 'owner.overview' ? await ownerOverview(staff)
            : action === 'owner.request.submit' ? await requestSubmit(staff, body)
              : await requestCancel(staff, body)
        return res.status(200).json(result)
      }
      case 'owner.switch': {
        const staff = await requireStaff(req, res, 'admin')
        if (!staff) return
        return res.status(200).json(await switchShop(staff, body))
      }

      case 'billing.status':
      case 'billing.submit': {
        // Muddati tugagan yoki to'lanmagan do'kon egasi ham kira olishi kerak —
        // shuning uchun bu yerda faqat xodimlik tekshiriladi, to'lov emas
        const staff = await requireStaff(req, res, 'admin')
        if (!staff) return
        const result = action === 'billing.status' ? await billingStatus(staff) : await billingSubmit(staff, body)
        return res.status(200).json(result)
      }

      case 'super.overview':
        await requireSuper(req)
        return res.status(200).json(await superOverview())
      case 'super.payment.approve':
        return res.status(200).json(await paymentApprove(await requireSuper(req), body))
      case 'super.payment.reject':
        return res.status(200).json(await paymentReject(await requireSuper(req), body))
      case 'super.shop.update':
        return res.status(200).json(await shopUpdate(await requireSuper(req), body))
      case 'super.shop.delete':
        return res.status(200).json(await shopDelete(await requireSuper(req), body))
      case 'super.settings.save':
        return res.status(200).json(await settingsSave(await requireSuper(req), body))
      case 'super.request.approve':
        return res.status(200).json(await requestApprove(await requireSuper(req), body))
      case 'super.request.reject':
        return res.status(200).json(await requestReject(await requireSuper(req), body))
      case 'super.broadcast.audience':
        await requireSuper(req)
        return res.status(200).json(await broadcastAudience())
      case 'super.broadcast.send':
        return res.status(200).json(await broadcastSend(await requireSuper(req), body))
      case 'super.broadcast.log':
        return res.status(200).json(await broadcastLog(await requireSuper(req), body))
      case 'super.bot.setup':
        await requireSuper(req)
        return res.status(200).json(await setupPlatformBot())

      default:
        return fail(res, 400, 'Noma’lum amal')
    }
  } catch (error) {
    if (error instanceof PlatformError) return fail(res, error.status, error.message, error.code)
    // Formadagi xato (noto'g'ri telefon, qisqa parol...) — matni tushunarli
    if (error instanceof DraftError) return fail(res, 400, error.message)
    // Server kaliti yo'q (lokal yoki yangi deploy) — forma «oldindan ko'rish»ni taklif qiladi
    if (error instanceof Error && error.message.startsWith('FIREBASE_SERVICE_ACCOUNT')) {
      return fail(res, 503, 'Server hali sozlanmagan: Firebase kaliti (FIREBASE_SERVICE_ACCOUNT) kiritilmagan.', 'api-missing')
    }
    console.error('[platform] xato:', action, error)
    return fail(res, 500, 'Server xatosi. Birozdan keyin qayta urinib ko‘ring.')
  }
}

/**
 * GET /api/platform — kalitlar sozlanganmi (qiymatlarning O'ZI qaytmaydi).
 * Bu javob kelsa-yu boshqa endpointlar ishlamasa, muammo kutubxonalarda.
 */
async function ping(res: VercelResponse) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || ''
  let projectId: string | null = null
  let valid = false
  let error: string | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      projectId = parsed.project_id ?? null
      valid = Boolean(parsed.project_id && parsed.client_email && parsed.private_key)
      if (!valid) error = 'JSON to‘liq emas'
    } catch {
      error = 'JSON o‘qib bo‘lmadi'
    }
  }
  const adminLoads = await import('firebase-admin/app').then(() => true, () => false)
  return res.status(200).json({
    ok: true,
    node: process.version,
    serviceAccount: { set: Boolean(raw), valid, projectId, error },
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : null),
    firebaseAdmin: adminLoads,
    platformBot: { set: Boolean(platformToken()), chatSet: Boolean(process.env.PLATFORM_CHAT_ID) },
    cronSecret: Boolean(process.env.CRON_SECRET),
  })
}
