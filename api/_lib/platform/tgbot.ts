import { createHash, createHmac, randomBytes } from 'node:crypto'
import { adminDb } from '../firebase-admin.js'
import { PLATFORM, TRIAL_DAYS } from '../../../src/platform/plans.js'
import { BOT_TOKEN_RE, attachBot } from './bot.js'
import { esc } from './notify.js'
import { phoneKey } from './owners.js'
import { PlatformError } from './errors.js'

/**
 * SavdoGO boti — hamma uchun bitta umumiy bot (PLATFORM_BOT_TOKEN).
 *
 *   /start          — raqamni yuborish → «Do'kon ochish» (forma mini app'da)
 *   kontakt         — tasdiqlangan telefon; shu raqam bilan saytda ochilgan
 *                     do'kon bo'lsa — egasi shu Telegram'ga biriktiriladi
 *   menyu           — do'kon havolasi, boshqaruv paneli (parolsiz), o'z botini
 *                     ulash, «Kompyuterda ochish» (bir martalik havola)
 *   token xabari    — o'z botini ulash (xabar xavfsizlik uchun o'chiriladi)
 *   /start login_X  — kompyuterdagi kirish oynasini tasdiqlash (tglogin.ts)
 *
 * Kim kimligi `tgUsers/{telegramId}` da: telefon, egasining uid'i va
 * do'koni. Telegram-da ochilgan egada email/parol yo'q — u Telegram
 * (initData) yoki bir martalik havola bilan kiradi.
 *
 * Webhook: /api/telegram?platform=1 (funksiyalar soni cheklangani uchun
 * do'kon botlari bilan bitta fayl). Sozlash — /super → Sozlamalar.
 */

const API = `${process.env.TELEGRAM_API_URL || 'https://api.telegram.org'}/bot`

export function platformToken(): string {
  return process.env.PLATFORM_BOT_TOKEN || ''
}

/** Webhook siri — tokendan hosil qilinadi, alohida env kerak emas. */
export function platformWebhookSecret(token = platformToken()): string {
  return createHmac('sha256', token).update('savdogo-platform-webhook').digest('hex').slice(0, 48)
}

/** Ommaviy manzil: webhook, mini app va havolalar. Lokal sinovda PUBLIC_BASE_URL. */
export function publicBase(): string {
  return (process.env.PUBLIC_BASE_URL || `https://${PLATFORM.rootDomain}`).replace(/\/+$/, '')
}

export function shopSiteUrl(shopId: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`
  if (process.env.PUBLIC_BASE_URL) return `${publicBase()}/?shop=${encodeURIComponent(shopId)}`
  return `https://${shopId}.${PLATFORM.rootDomain}`
}

type Button =
  | { text: string; url: string }
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } }

export type TgResponse<T> = { ok: boolean; result?: T; error_code?: number; description?: string }

/** Bot API javobi to'liq (xato kodi bilan) — ommaviy xabar bloklaganlarni shundan biladi. */
export async function tgRequest<T = unknown>(method: string, body: Record<string, unknown>): Promise<TgResponse<T>> {
  const token = platformToken()
  if (!token) return { ok: false, description: 'PLATFORM_BOT_TOKEN qo‘yilmagan' }
  try {
    const response = await fetch(`${API}${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => ({}))) as TgResponse<T>
    return json.ok ? json : { ...json, ok: false, error_code: json.error_code ?? response.status }
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : 'Tarmoq xatosi' }
  }
}

/** Bot API chaqiruvi. Xato tashlamaydi — bot xabari asosiy amalni buzmasin. */
export async function tgCall<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const json = await tgRequest<T>(method, body)
  if (!json.ok) {
    console.warn(`[tgbot] ${method}:`, json.description || json.error_code)
    return null
  }
  return (json.result ?? null) as T | null
}

export function sendText(chatId: number | string, text: string, rows?: Button[][], extra: Record<string, unknown> = {}) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}),
    ...extra,
  })
}

/* ─── Kim kim ─────────────────────────────────────────────── */

export type TgUserDoc = {
  phone?: string
  firstName?: string
  lastName?: string | null
  username?: string | null
  /** Do'kon egasining Firebase uid'i (do'kon ochgan yoki biriktirilgan bo'lsa). */
  uid?: string | null
  /** Keyingi xabarni nima deb tushunish kerak. */
  awaiting?: 'bot-token' | null
  /** Botni bloklagan — ommaviy xabar unga yuborilmaydi (qayta yozsa — ochiladi). */
  blocked?: boolean
  createdAt?: string
  lastSeen?: string
}

type TgFrom = { id: number; first_name?: string; last_name?: string; username?: string }

export async function tgUserRef(telegramId: number) {
  return (await adminDb()).collection('tgUsers').doc(String(telegramId))
}

export async function readTgUser(telegramId: number): Promise<TgUserDoc> {
  return ((await (await tgUserRef(telegramId)).get()).data() ?? {}) as TgUserDoc
}

/**
 * Botga yozgan har kim ro'yxatda (raqam yubormagan bo'lsa ham) — ommaviy
 * xabar /super dan shu ro'yxatga ketadi. Ism yangilanadi, blok ochiladi.
 */
async function touchUser(from: TgFrom, known: TgUserDoc) {
  const now = new Date().toISOString()
  await (await tgUserRef(from.id)).set(
    {
      firstName: from.first_name || '',
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      lastSeen: now,
      blocked: false,
      ...(known.createdAt ? {} : { createdAt: now }),
    },
    { merge: true },
  )
}

/** Egasining hozirgi do'koni (staffIndex) va uning ommaviy hujjati. */
export async function ownerShop(uid: string) {
  const db = await adminDb()
  const shopId = String((await db.collection('staffIndex').doc(uid).get()).data()?.shopId || '')
  if (!shopId) return null
  const snap = await db.collection('shops').doc(shopId).get()
  if (!snap.exists) return null
  return { ...(snap.data() as Record<string, unknown>), id: shopId } as Record<string, unknown> & { id: string }
}

/* ─── Menyular ────────────────────────────────────────────── */

function contactKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  }
}

function statusLine(shop: Record<string, unknown>): string {
  const until = typeof shop.paidUntil === 'string' ? Date.parse(shop.paidUntil) : 0
  const days = until ? Math.ceil((until - Date.now()) / 86_400_000) : 0
  if (shop.status === 'blocked') return '⛔ Do‘kon vaqtincha to‘xtatilgan'
  if (!until || days <= 0) return shop.trial ? '⏳ Bepul sinov tugadi — obunani to‘lang' : '⏳ Obuna muddati tugagan'
  return shop.trial ? `🎁 Bepul sinov: yana ${days} kun` : `✅ Obuna faol: yana ${days} kun`
}

/** Do'kon egasining bosh menyusi. */
export async function sendOwnerMenu(chatId: number, uid: string, heading?: string) {
  const shop = await ownerShop(uid)
  if (!shop) {
    await sendText(chatId, 'Do‘koningiz topilmadi. Biz bilan bog‘laning: ' + PLATFORM.telegram)
    return
  }
  const name = String(shop.name || shop.id)
  const site = shopSiteUrl(shop.id, (shop.customDomain as string | null) ?? null)
  const bot = typeof shop.botUsername === 'string' && shop.botUsername ? shop.botUsername : ''
  const text = [
    heading ?? `🏪 <b>${esc(name)}</b>`,
    '',
    `🌐 ${site}`,
    statusLine(shop),
    bot ? `🤖 Do‘kon boti: @${bot}` : '🤖 O‘z botingiz hali ulanmagan — bepul ulang, mijozlar do‘konni botda ochadi',
  ].join('\n')
  const rows: Button[][] = [
    [{ text: '⚙️ Boshqaruv paneli', web_app: { url: `${publicBase()}/admin` } }],
    [{ text: '🌐 Do‘konni ochish', url: site }],
    [bot ? { text: `🤖 @${bot}`, url: `https://t.me/${bot}` } : { text: '🤖 O‘z botimni ulash (bepul)', callback_data: 'bot' }],
    [{ text: '💻 Kompyuterda ochish', callback_data: 'web' }],
  ]
  await sendText(chatId, text, rows)
}

async function sendStartMenu(chatId: number, user: TgUserDoc, from: TgFrom) {
  if (user.uid) return sendOwnerMenu(chatId, user.uid)
  if (!user.phone) {
    await sendText(
      chatId,
      [
        `👋 Assalomu alaykum, ${esc(from.first_name || '')}!`,
        '',
        `<b>${PLATFORM.name}</b> — biznesingiz uchun tayyor onlayn do‘kon: sayt, admin panel va Telegram bot.`,
        `5 daqiqada ochiladi, ${TRIAL_DAYS} kun bepul.`,
        '',
        'Boshlash uchun pastdagi tugma bilan raqamingizni yuboring 👇',
      ].join('\n'),
      undefined,
      contactKeyboard(),
    )
    return
  }
  await sendText(
    chatId,
    `🛍 Do‘koningizni ochamiz — biznes turi, nomi, logo va ranglarni tanlaysiz. ${TRIAL_DAYS} kun bepul, karta kerak emas.`,
    [[{ text: '🛍 Do‘kon ochish', web_app: { url: `${publicBase()}/start` } }]],
  )
}

/* ─── Hodisalar ───────────────────────────────────────────── */

type TgMessage = {
  message_id: number
  chat: { id: number; type: string }
  from?: TgFrom
  text?: string
  contact?: { phone_number: string; user_id?: number; first_name?: string; last_name?: string }
}
export type PlatformUpdate = {
  message?: TgMessage
  callback_query?: { id: string; from: TgFrom; data?: string; message?: TgMessage }
  /** Foydalanuvchi botni bloklasa (kicked) yoki qayta ochsa (member). */
  my_chat_member?: { chat: { id: number; type: string }; from: TgFrom; new_chat_member?: { status?: string } }
}

/**
 * Kontakt: faqat O'Z raqami (`user_id` yuboruvchiniki bo'lishi shart).
 * Saytda shu raqam bilan do'kon ochilgan bo'lsa — egasi shu Telegram'ga
 * biriktiriladi: Telegram raqamni tasdiqlagan, ya'ni raqam egasi — u.
 */
async function onContact(message: TgMessage, from: TgFrom) {
  const contact = message.contact!
  if (contact.user_id !== from.id) {
    await sendText(message.chat.id, 'Faqat o‘zingizning raqamingizni yuboring — pastdagi tugma bilan 👇', undefined, contactKeyboard())
    return
  }
  const phone = phoneKey(contact.phone_number)
  if (!phone) {
    await sendText(message.chat.id, 'Hozircha faqat O‘zbekiston raqamlari (+998) qabul qilinadi.', undefined, { reply_markup: { remove_keyboard: true } })
    return
  }

  const db = await adminDb()
  const ref = await tgUserRef(from.id)
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    phone,
    firstName: from.first_name || '',
    lastName: from.last_name ?? null,
    username: from.username ?? null,
    updatedAt: now,
  }

  const existing = (await db.collection('ownerPhones').doc(phone).get()).data()
  const uid = typeof existing?.uid === 'string' ? existing.uid : ''
  if (uid) {
    patch.uid = uid
    await linkOwnerTelegram(uid, from)
  }
  await ref.set({ ...patch, createdAt: (await ref.get()).data()?.createdAt ?? now }, { merge: true })

  await sendText(message.chat.id, '✅ Raqamingiz qabul qilindi.', undefined, { reply_markup: { remove_keyboard: true } })
  if (uid) await sendOwnerMenu(message.chat.id, uid, '🔗 Bu raqam bilan ochilgan do‘koningiz Telegram’ga ulandi.')
  else await sendStartMenu(message.chat.id, { ...patch, uid: null } as TgUserDoc, from)
}

/** Egasining do'kondagi xodim hujjatiga Telegram ID — buyurtma xabarlari unga keladi. */
export async function linkOwnerTelegram(uid: string, from: TgFrom) {
  const db = await adminDb()
  const shopId = String((await db.collection('staffIndex').doc(uid).get()).data()?.shopId || '')
  if (!shopId) return
  const staffRef = db.collection('shops').doc(shopId).collection('staff').doc(uid)
  const staff = (await staffRef.get()).data()
  // Allaqachon biriktirilgan bo'lsa (o'sha yoki boshqa Telegram) — tegmaymiz
  if (!staff || staff.telegramId) return
  // Shu Telegram boshqa xodimga biriktirilgan bo'lsa — tegmaymiz
  const clash = await db.collection('shops').doc(shopId).collection('staff').where('telegramId', '==', from.id).limit(1).get()
  if (!clash.empty) return
  await staffRef.set({ telegramId: from.id, telegramUsername: from.username ?? null, telegramLinkedAt: new Date().toISOString() }, { merge: true })
}

async function onBotToken(message: TgMessage, from: TgFrom, user: TgUserDoc, token: string) {
  // Token — maxfiy: chatda qolmasin
  await tgCall('deleteMessage', { chat_id: message.chat.id, message_id: message.message_id })
  if (!user.uid) {
    await sendText(message.chat.id, 'Avval do‘kon oching — keyin botingizni ulaymiz. /start')
    return
  }
  const shop = await ownerShop(user.uid)
  if (!shop) return
  await sendText(message.chat.id, '⏳ Botingiz ulanmoqda...')
  try {
    const { botUsername } = await attachBot(shop.id, token, `telegram:${from.id}`)
    await (await tgUserRef(from.id)).set({ awaiting: null }, { merge: true })
    await sendText(
      message.chat.id,
      [
        `🎉 <b>@${botUsername}</b> do‘koningizga ulandi!`,
        '',
        '• Mijozlar do‘konni shu botda ilovadek ochadi',
        '• Kuryerlar, jonli xarita va kassa admin panelda ochildi',
        `• Yangi buyurtmalar sizga @${botUsername} orqali keladi — unga bir marta /start yozing`,
      ].join('\n'),
      [[{ text: `🤖 @${botUsername} ni ochish`, url: `https://t.me/${botUsername}` }], [{ text: '⬅️ Menyu', callback_data: 'm' }]],
    )
  } catch (error) {
    const text = error instanceof PlatformError ? error.message : 'Botni ulab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.'
    if (!(error instanceof PlatformError)) console.error('[tgbot] bot ulanmadi:', error)
    await sendText(message.chat.id, `❌ ${esc(text)}\n\nTokenni qayta yuboring yoki /start`)
  }
}

async function onCallback(query: NonNullable<PlatformUpdate['callback_query']>) {
  await tgCall('answerCallbackQuery', { callback_query_id: query.id })
  const chatId = query.message?.chat.id
  if (!chatId) return
  const user = await readTgUser(query.from.id)
  await touchUser(query.from, user)

  if (query.data === 'm') return sendStartMenu(chatId, user, query.from)
  if (!user.uid) return sendStartMenu(chatId, user, query.from)

  if (query.data?.startsWith('login:')) {
    const { confirmLoginRequest } = await import('./tglogin.js')
    return confirmLoginRequest(chatId, user.uid, query.data.slice('login:'.length))
  }

  if (query.data === 'bot') {
    await (await tgUserRef(query.from.id)).set({ awaiting: 'bot-token' }, { merge: true })
    await sendText(
      chatId,
      [
        '🤖 <b>O‘z botingizni ulash — bepul, 2 daqiqa</b>',
        '',
        '1. @BotFather ni oching va /newbot yozing',
        '2. Botga nom bering (masalan, do‘koningiz nomi)',
        '3. Username bering — oxiri <code>bot</code> bilan tugasin (masalan, <code>kafenur_bot</code>)',
        '4. BotFather yuborgan <b>tokenni</b> (<code>123456789:AA...</code>) nusxalab, shu yerga yuboring',
        '',
        'Token xabari ulangach chatdan o‘chiriladi.',
      ].join('\n'),
      [[{ text: '🔑 @BotFather ni ochish', url: 'https://t.me/BotFather' }], [{ text: '⬅️ Menyu', callback_data: 'm' }]],
    )
    return
  }

  if (query.data === 'web') {
    const { createLoginLink } = await import('./tglogin.js')
    const url = await createLoginLink(user.uid)
    await sendText(
      chatId,
      [
        '💻 <b>Kompyuterda kirish</b>',
        '',
        'Havolani kompyuterda oching (Telegram Desktop yoki brauzer) — parolsiz kirasiz.',
        'Havola 10 daqiqa va faqat bir marta ishlaydi. Hech kimga bermang.',
        '',
        `<code>${esc(url)}</code>`,
      ].join('\n'),
      [[{ text: '🔓 Admin panelga kirish', url }]],
    )
  }
}

export async function handlePlatformUpdate(update: PlatformUpdate) {
  if (update.callback_query) return onCallback(update.callback_query)

  const member = update.my_chat_member
  if (member && member.chat.type === 'private') {
    const status = member.new_chat_member?.status
    if (status === 'kicked' || status === 'member') {
      await (await tgUserRef(member.from.id)).set({ blocked: status === 'kicked', updatedAt: new Date().toISOString() }, { merge: true })
    }
    return
  }

  const message = update.message
  if (!message?.from || message.chat.type !== 'private') return
  const from = message.from

  if (message.contact) return onContact(message, from)

  const text = (message.text || '').trim()
  const user = await readTgUser(from.id)
  await touchUser(from, user)

  // Platforma egasi uchun: PLATFORM_CHAT_ID ni bilish (webhook bor — getUpdates ishlamaydi)
  if (text === '/id') return sendText(message.chat.id, `Chat ID: <code>${message.chat.id}</code>`)

  if (text.startsWith('/start login_')) {
    const { approveLoginRequest } = await import('./tglogin.js')
    return approveLoginRequest(message.chat.id, from, user, text.slice('/start login_'.length))
  }
  if (BOT_TOKEN_RE.test(text)) return onBotToken(message, from, user, text)
  if (user.awaiting === 'bot-token' && text && !text.startsWith('/')) {
    await sendText(message.chat.id, 'Bu token emas. BotFather yuborgan xabardagi <code>123456789:AA...</code> ko‘rinishidagi qatorni to‘liq nusxalab yuboring.')
    return
  }
  return sendStartMenu(message.chat.id, user, from)
}

/* ─── Sozlash va xabarlar ─────────────────────────────────── */

/**
 * Bot profili. «Botni sozlash» bosilganda Telegram'ga yoziladi (BotFather'da
 * qo'lda yozish shart emas). Telegram cheklovlari: bio 120, tavsif 512 belgi.
 */
export const BOT_ABOUT =
  `${PLATFORM.name} — 5 daqiqada tayyor onlayn do‘kon: sayt, Telegram bot va admin panel. ${TRIAL_DAYS} kun bepul 🎁`

export const BOT_DESCRIPTION = [
  `🛍 ${PLATFORM.name} — biznesingiz uchun tayyor onlayn do‘kon.`,
  '',
  'Kafe, kiyim, gul, mebel, kosmetika — qaysi biznes bo‘lmasin, shu botda 5 daqiqada do‘kon ochasiz:',
  `✅ Shaxsiy sayt: nomingiz.${PLATFORM.rootDomain}`,
  '✅ Telegram bot — mijozlar do‘konni ilovadek ochadi',
  '✅ Buyurtmalar, kuryerlar va hisobot — telefoningizda',
  '✅ Dasturchi va dizayner kerak emas',
  '',
  `🎁 ${TRIAL_DAYS} kun bepul, karta kerak emas.`,
  '👇 «Boshlash» tugmasini bosing',
].join('\n')

/** Webhook, buyruqlar va tavsif — /super → Sozlamalar → «SavdoGO botini sozlash». */
export async function setupPlatformBot() {
  const token = platformToken()
  if (!token) throw new PlatformError('Vercel’da PLATFORM_BOT_TOKEN qo‘yilmagan — qo‘shib, Redeploy qiling')
  const me = await tgCall<{ username: string }>('getMe', {})
  if (!me) throw new PlatformError('PLATFORM_BOT_TOKEN noto‘g‘ri — BotFather bergan tokenni tekshiring')
  const webhook = await tgCall('setWebhook', {
    url: `${publicBase()}/api/telegram?platform=1`,
    secret_token: platformWebhookSecret(token),
    // my_chat_member — kim botni bloklagani (ommaviy xabar ro'yxati uchun)
    allowed_updates: ['message', 'callback_query', 'my_chat_member'],
    drop_pending_updates: true,
  })
  if (webhook === null) throw new PlatformError('Webhook o‘rnatilmadi — sayt manzili ochiqmi (https)?')
  await tgCall('setMyCommands', { commands: [{ command: 'start', description: 'Bosh menyu — do‘kon ochish va boshqarish' }] })
  await tgCall('setMyShortDescription', { short_description: BOT_ABOUT })
  await tgCall('setMyDescription', { description: BOT_DESCRIPTION })
  return { botUsername: me.username, webhook: `${publicBase()}/api/telegram?platform=1` }
}

/**
 * Do'kon tayyor — Telegram orqali ochgan egaga. Xato tashlamaydi.
 * `deliveredTo` — xabar kimga ketgani (sinov va jurnal uchun).
 */
export async function announceNewShop(telegramId: number, uid: string, shopName: string) {
  try {
    await sendOwnerMenu(
      telegramId,
      uid,
      [`🎉 <b>${esc(shopName)}</b> ochildi!`, '', `${TRIAL_DAYS} kun bepul — hamma imkoniyat ochiq. Mahsulotlaringizni qo‘shing va havolani mijozlarga yuboring.`].join('\n'),
    )
  } catch (error) {
    console.warn('[tgbot] do‘kon xabari ketmadi:', error)
  }
}

/** Bir martalik sir (kirish havolasi va kompyuter kirishi uchun). */
export function newSecret(): { raw: string; hash: string } {
  const raw = randomBytes(24).toString('base64url')
  return { raw, hash: createHash('sha256').update(raw).digest('hex') }
}
