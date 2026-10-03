import type { VercelRequest, VercelResponse } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'
import { adminDb } from './_lib/firebase-admin.js'
import { loadShopContext, shopDoc, withShop } from './_lib/context.js'
import { adminTargets, miniAppUrl, orderStatus } from './_lib/actions/orders.js'
import { rateOrderProducts } from './_lib/actions/courier-rating.js'
import { escapeHtml, sendMessage, sendRows } from './_lib/telegram.js'
import { saveCourierLocation } from './_lib/actions/location.js'
import { canDeliver } from './_lib/courier-staff.js'
import type { Staff, StaffRole } from './_lib/admin-auth.js'

/**
 * POST /api/telegram?shop=<id> — do'kon botining webhook'i.
 *
 * Har do'konning o'z boti bor (qo'shimcha xizmat). Telegram so'rovni
 * `X-Telegram-Bot-Api-Secret-Token` sarlavhasi bilan yuboradi — u bot
 * ulanganda yaratilgan sirga teng bo'lishi shart (api/_lib/platform/bot.ts).
 *
 * Nimalar qilinadi:
 *   /start            — do'konni ochish tugmasi (mini app)
 *   adm:acc:<id>      — admin xabaridagi «✅ Qabul qilindi»
 *   rv:<id>:all:<n>   — mijozning bahosi (0 — o'tkazib yuborish)
 *   rasm              — to'lov cheki: adminlarga yuboriladi
 *   joylashuv         — kuryerning «Jonli joylashuv»i (admin xaritasi va
 *                       mijozning «Kuryer qayerda» kuzatuvi)
 *   noop              — holat yorlig'i, hech narsa qilinmaydi
 *
 * Telegram javobni kutmasin: har doim 200 qaytariladi, aks holda u
 * so'rovni qayta-qayta yuboradi.
 */
type TgUser = { id: number; first_name?: string; username?: string }
type TgLocation = {
  latitude: number
  longitude: number
  horizontal_accuracy?: number
  heading?: number
  /** Jonli ulashish davomiyligi, soniya. 0x7FFFFFFF — «Men o'chirgunimcha». */
  live_period?: number
}
type TgMessage = {
  message_id: number
  date?: number
  chat: { id: number; type: string }
  location?: TgLocation
  from?: TgUser
  text?: string
  photo?: { file_id: string }[]
  document?: { file_id: string; mime_type?: string }
  caption?: string
}
type TgUpdate = {
  message?: TgMessage
  edited_message?: TgMessage
  callback_query?: { id: string; from: TgUser; data?: string; message?: TgMessage }
}

async function tg(token: string, method: string, body: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)
}

/** Telegram id bo'yicha shu do'kon xodimi. */
async function staffByTelegram(telegramId: number, shopId: string): Promise<Staff | null> {
  const tenant = await shopDoc()
  const snap = await tenant.collection('staff').where('telegramId', '==', telegramId).limit(1).get()
  const doc = snap.docs[0]
  if (!doc) return null
  const data = doc.data()
  if (data.active === false) return null
  return {
    uid: doc.id,
    shopId,
    email: String(data.email || ''),
    name: String(data.name || ''),
    role: (data.role as StaffRole) || 'courier',
    telegramId,
    phone: data.phone ?? null,
    active: true,
    canDeliver: data.canDeliver === true,
  }
}

async function onCallback(token: string, shopId: string, query: NonNullable<TgUpdate['callback_query']>) {
  const data = query.data || ''
  const answer = (text?: string, alert = false) => tg(token, 'answerCallbackQuery', { callback_query_id: query.id, text, show_alert: alert })

  if (data === 'noop') return answer()

  const accept = /^adm:acc:(.+)$/.exec(data)
  if (accept) {
    const staff = await staffByTelegram(query.from.id, shopId)
    if (!staff || staff.role === 'courier') return answer('Buyurtmani faqat admin tasdiqlaydi', true)
    try {
      await orderStatus(staff, { orderId: accept[1], status: 'Qabul qilindi' })
      return answer('✅ Qabul qilindi')
    } catch (error) {
      return answer(error instanceof Error ? error.message : 'Bajarilmadi', true)
    }
  }

  const rating = /^rv:([^:]+):all:([0-5])$/.exec(data)
  if (rating) {
    const [, orderId, starsRaw] = rating
    const stars = Number(starsRaw)
    const tenant = await shopDoc()
    const order = (await tenant.collection('orders').doc(orderId).get()).data()
    if (!order || Number(order.userId) !== query.from.id) return answer('Bu buyurtma sizniki emas', true)
    if (order.status !== 'Yetkazildi') return answer('Buyurtma hali yetkazilmagan', true)
    if (stars > 0) await rateOrderProducts(String(query.from.id), orderId, stars)
    if (query.message) {
      await tg(token, 'editMessageText', {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        text: stars > 0 ? `⭐ Bahoyingiz uchun rahmat! (${stars}/5)` : 'Rahmat!',
      })
    }
    return answer()
  }

  return answer()
}

const LIVE_FOREVER = 0x7fffffff
/** Bitta kuryerdan ko'pi bilan shuncha soniyada bir yozuv — Firestore ortiqcha yuklanmasin. */
const LOCATION_MIN_INTERVAL_MS = 8_000

const SHARE_LIVE_HELP =
  '📍 <b>Jonli joylashuvni qanday yoqish kerak</b>\n\n' +
  '1. Shu chatda pastdagi 📎 tugmasini bosing\n' +
  '2. «Joylashuv» (Location) ni tanlang\n' +
  '3. «Jonli joylashuvni ulashish» → <b>«Men o‘chirgunimcha»</b>\n\n' +
  'Shundan keyin ilova yopiq bo‘lsa ham admin sizni xaritada ko‘radi, yo‘ldagi buyurtmangiz mijozi esa ' +
  'kuryer qayerdaligini kuzatib boradi.\n\n<i>Smena tugaganda xabardagi «Ulashishni to‘xtatish» ni bosing.</i>'

/**
 * Kuryerning joylashuvi. Kuryer botga bir marta «Jonli joylashuv»
 * yuboradi — keyin Telegram uni FONDA yangilab turadi (mini app yopiq,
 * ekran o'chiq bo'lsa ham), har yangilanish `edited_message` bo'lib keladi.
 * Mijoz yoki begona yuborgan joylashuv e'tiborsiz qoldiriladi.
 */
async function onLocation(shopId: string, message: TgMessage, edited: boolean) {
  const from = message.from
  const loc = message.location
  if (!from || !loc) return
  const staff = await staffByTelegram(from.id, shopId)
  if (!staff || !canDeliver(staff)) return

  if (edited) {
    const prev = (await (await shopDoc()).collection('courier_locations').doc(staff.uid).get()).data()
    if (prev?.at && Date.now() - Date.parse(String(prev.at)) < LOCATION_MIN_INTERVAL_MS) return
  }

  const live = Boolean(loc.live_period)
  const liveUntil = live && loc.live_period! < LIVE_FOREVER
    ? new Date(((message.date ?? Math.floor(Date.now() / 1000)) + loc.live_period!) * 1000).toISOString()
    : null
  const result = await saveCourierLocation(
    staff,
    { lat: loc.latitude, lng: loc.longitude, accuracy: loc.horizontal_accuracy ?? null, heading: loc.heading ?? null },
    live ? 'live' : 'app',
    liveUntil,
  )

  if (edited) return
  if (!result.saved && result.reason === 'off_shift') {
    await sendMessage(
      from.id,
      '🌙 Siz hozir <b>dam olyapsiz</b> — joylashuvingiz saqlanmadi.\n\n' +
        'Ishga chiqqaningizda ilovada «Ishdaman» ni yoqing, keyin joylashuvni qayta ulashing.',
    )
    return
  }
  if (live) {
    const tracked = result.tracked ?? 0
    await sendMessage(
      from.id,
      '✅ <b>Jonli joylashuv ulandi!</b>\nAdmin sizni xaritada ko‘radi' +
        (tracked ? `, ${tracked} ta yo‘ldagi buyurtma mijozi ham kuzatib boradi.` : '.') +
        '\n\n<i>Smena tugaganda xabardagi «Ulashishni to‘xtatish» ni bosing.</i>',
    )
  } else {
    await sendMessage(from.id, '📍 Joylashuv saqlandi, lekin bu <b>bir martalik</b>.\n\n' + SHARE_LIVE_HELP)
  }
}

async function onMessage(token: string, shopName: string, message: TgMessage) {
  if (message.chat.type !== 'private' || !message.from) return
  const app = miniAppUrl()

  // To'lov cheki — rasm yoki PDF: adminlarga yuboriladi
  const fileId = message.photo?.at(-1)?.file_id || (message.document?.mime_type?.match(/^(image|application\/pdf)/) ? message.document.file_id : null)
  if (fileId) {
    const who = [message.from.first_name, message.from.username ? `@${message.from.username}` : ''].filter(Boolean).join(' ')
    const caption = `🧾 <b>To‘lov cheki</b> — ${escapeHtml(who)} (ID ${message.from.id})${message.caption ? `\n${escapeHtml(message.caption)}` : ''}`
    for (const target of await adminTargets()) {
      await tg(token, message.photo ? 'sendPhoto' : 'sendDocument', {
        chat_id: target,
        [message.photo ? 'photo' : 'document']: fileId,
        caption,
        parse_mode: 'HTML',
      })
    }
    await tg(token, 'sendMessage', { chat_id: message.chat.id, text: '✅ Chek do‘konga yuborildi. Tekshirilgach buyurtmangiz tasdiqlanadi.' })
    return
  }

  // /start (yoki istalgan matn) — do'konni ochish tugmasi
  if (app) {
    await sendRows(
      message.chat.id,
      `👋 <b>${escapeHtml(shopName)}</b> ga xush kelibsiz!\n\nKatalogni ochib, bir necha bosishda buyurtma bering.`,
      [[{ text: '🛍 Do‘konni ochish', web_app: { url: app } }]],
    )
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })
  const shopId = String(req.query.shop || '').trim().toLowerCase()

  try {
    const db = await adminDb()
    const secrets = shopId ? (await db.collection('shopSecrets').doc(shopId).get()).data() : null
    const expected = String(secrets?.webhookSecret || '')
    const given = String(req.headers['x-telegram-bot-api-secret-token'] || '')
    const a = Buffer.from(expected)
    const b = Buffer.from(given)
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return res.status(200).json({ ok: false })

    const context = await loadShopContext(shopId)
    if (!context?.botToken) return res.status(200).json({ ok: false })
    const token = context.botToken
    const update = (req.body ?? {}) as TgUpdate

    await withShop(context, async () => {
      if (update.callback_query) await onCallback(token, shopId, update.callback_query)
      else if (update.edited_message?.location) await onLocation(shopId, update.edited_message, true)
      else if (update.message?.location) await onLocation(shopId, update.message, false)
      else if (update.message) await onMessage(token, context.shopName, update.message)
    })
  } catch (error) {
    console.error('[telegram] webhook xatosi:', error)
  }
  return res.status(200).json({ ok: true })
}
