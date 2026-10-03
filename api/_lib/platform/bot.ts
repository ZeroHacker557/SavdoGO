import { randomBytes } from 'node:crypto'
import { adminDb } from '../firebase-admin.js'
import { PLATFORM } from '../../../src/platform/plans.js'
import { PlatformError } from './errors.js'

/**
 * Do'konga o'z Telegram botini ulash — BEPUL.
 *
 * Ega BotFather bergan tokenni o'zi kiritadi: admin paneldagi
 * «Kuryerlar va Telegram» sahifasida yoki SavdoGO botiga yuborib.
 * Platforma egasi ham /super panelidan ulay oladi. Shu yerda:
 *   1. token tekshiriladi (getMe) — username o'zi olinadi;
 *   2. bot boshqa do'konga ulanmaganmi — `botIndex/{botId}`;
 *   3. webhook o'rnatiladi: /api/telegram?shop=<id>, maxfiy sarlavha bilan
 *      (Telegram har so'rovda uni yuboradi — begona so'rov o'tmaydi);
 *   4. menyu tugmasi do'kon saytini mini app sifatida ochadi;
 *   5. token `shopSecrets/{id}` ga yoziladi — brauzer uni hech qachon ko'rmaydi.
 */
const TG = `${process.env.TELEGRAM_API_URL || 'https://api.telegram.org'}/bot`

/** BotFather tokeni: «123456789:AA...». */
export const BOT_TOKEN_RE = /^\d{5,}:[A-Za-z0-9_-]{30,}$/

async function call<T>(token: string, method: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${TG}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string }
  if (!json.ok) {
    if (response.status === 401 || response.status === 404) throw new PlatformError('Bot tokeni noto‘g‘ri yoki eskirgan — BotFather’dan yangisini oling')
    throw new PlatformError(`Telegram: ${json.description || response.status}`, 400)
  }
  return json.result as T
}

/** Webhook uchun ommaviy manzil. Lokal sinovda PUBLIC_BASE_URL (masalan ngrok). */
function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || `https://${PLATFORM.rootDomain}`).replace(/\/+$/, '')
}

function shopSiteUrl(shopId: string, customDomain: string | null): string {
  return customDomain ? `https://${customDomain}` : `https://${shopId}.${PLATFORM.rootDomain}`
}

/** Tokenning «:» gacha qismi — botning doimiy raqami (token yangilansa ham o'zgarmaydi). */
function botIdOf(token: string): string {
  return token.split(':')[0]
}

export async function connectBot(shopId: string, token: string, shopName: string, customDomain: string | null) {
  if (!BOT_TOKEN_RE.test(token)) throw new PlatformError('Bot tokeni noto‘g‘ri — BotFather bergan to‘liq tokenni kiriting')

  const me = await call<{ id: number; username: string }>(token, 'getMe')
  const db = await adminDb()
  const botId = String(me.id)

  // Bitta bot — bitta do'kon: aks holda ikkinchi ulanish birinchisining webhook'ini tortib oladi
  const indexRef = db.collection('botIndex').doc(botId)
  const holder = String((await indexRef.get()).data()?.shopId || '')
  if (holder && holder !== shopId) {
    const holderToken = String((await db.collection('shopSecrets').doc(holder).get()).data()?.botToken || '')
    if (botIdOf(holderToken) === botId) throw new PlatformError('Bu bot boshqa do‘konga ulangan — BotFather’da yangi bot yarating', 409, 'bot-taken')
  }

  // Do'konda boshqa bot turgan bo'lsa — u endi xabar olmasin
  const secretsRef = db.collection('shopSecrets').doc(shopId)
  const previous = String((await secretsRef.get()).data()?.botToken || '')
  if (previous && botIdOf(previous) !== botId) {
    await call(previous, 'deleteWebhook').catch(() => undefined)
    await db.collection('botIndex').doc(botIdOf(previous)).delete().catch(() => undefined)
  }

  const secret = randomBytes(24).toString('hex')
  await call(token, 'setWebhook', {
    url: `${baseUrl()}/api/telegram?shop=${encodeURIComponent(shopId)}`,
    secret_token: secret,
    // edited_message — kuryerning «Jonli joylashuv» yangilanishlari shu bo'lib keladi
    allowed_updates: ['message', 'edited_message', 'callback_query'],
    drop_pending_updates: true,
  })
  await call(token, 'setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'Do‘kon', web_app: { url: shopSiteUrl(shopId, customDomain) } },
  })
  await call(token, 'setMyCommands', { commands: [{ command: 'start', description: `${shopName} — do‘konni ochish` }] })

  const now = new Date().toISOString()
  const batch = db.batch()
  batch.set(secretsRef, { botToken: token, webhookSecret: secret, connectedAt: now })
  batch.set(indexRef, { shopId, username: me.username, connectedAt: now })
  await batch.commit()
  return { botUsername: me.username }
}

export async function disconnectBot(shopId: string) {
  const db = await adminDb()
  const ref = db.collection('shopSecrets').doc(shopId)
  const token = String((await ref.get()).data()?.botToken || '')
  if (token) {
    await call(token, 'deleteWebhook').catch(() => undefined)
    await db.collection('botIndex').doc(botIdOf(token)).delete().catch(() => undefined)
  }
  await ref.delete()
}

/**
 * Botni ulab, do'kon hujjatini ham yangilaydi — admin panel, SavdoGO boti
 * va /super shu funksiyani chaqiradi. `telegramAddon` eski (pullik)
 * davrdan qolgan belgi: endi u «bot ulangan» degani.
 */
export async function attachBot(shopId: string, token: string, updatedBy: string) {
  const db = await adminDb()
  const shopRef = db.collection('shops').doc(shopId)
  const shop = (await shopRef.get()).data()
  if (!shop) throw new PlatformError('Do‘kon topilmadi', 404)
  const customDomain = typeof shop.customDomain === 'string' ? shop.customDomain : null
  const { botUsername } = await connectBot(shopId, token.trim(), String(shop.name || shopId), customDomain)
  await shopRef.update({ botUsername, telegramAddon: true, updatedAt: new Date().toISOString(), updatedBy })
  return { botUsername }
}

export async function detachBot(shopId: string, updatedBy: string) {
  const db = await adminDb()
  await disconnectBot(shopId)
  await db.collection('shops').doc(shopId).update({ botUsername: null, updatedAt: new Date().toISOString(), updatedBy })
  return { botUsername: null }
}
