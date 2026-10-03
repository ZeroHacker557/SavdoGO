import { randomBytes } from 'node:crypto'
import { adminDb } from '../firebase-admin.js'
import { PLATFORM } from '../../../src/platform/plans.js'
import { PlatformError } from './errors.js'

/**
 * Do'konga Telegram bot ulash (qo'shimcha xizmat, $50).
 *
 * Platforma egasi /super panelida BotFather bergan tokenni kiritadi.
 * Shu yerda:
 *   1. token tekshiriladi (getMe) — username o'zi olinadi;
 *   2. webhook o'rnatiladi: /api/telegram?shop=<id>, maxfiy sarlavha bilan
 *      (Telegram har so'rovda uni yuboradi — begona so'rov o'tmaydi);
 *   3. menyu tugmasi do'kon saytini mini app sifatida ochadi;
 *   4. token `shopSecrets/{id}` ga yoziladi — brauzer uni hech qachon ko'rmaydi.
 */
const TG = 'https://api.telegram.org/bot'

async function call<T>(token: string, method: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${TG}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string }
  if (!json.ok) throw new PlatformError(`Telegram: ${json.description || response.status}`, 400)
  return json.result as T
}

/** Webhook uchun ommaviy manzil. Lokal sinovda PUBLIC_BASE_URL (masalan ngrok). */
function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || `https://${PLATFORM.rootDomain}`).replace(/\/+$/, '')
}

function shopSiteUrl(shopId: string, customDomain: string | null): string {
  return customDomain ? `https://${customDomain}` : `https://${shopId}.${PLATFORM.rootDomain}`
}

export async function connectBot(shopId: string, token: string, shopName: string, customDomain: string | null) {
  if (!/^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(token)) throw new PlatformError('Bot tokeni noto‘g‘ri — BotFather bergan to‘liq tokenni kiriting')

  const me = await call<{ username: string }>(token, 'getMe')
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

  const db = await adminDb()
  await db.collection('shopSecrets').doc(shopId).set({ botToken: token, webhookSecret: secret, connectedAt: new Date().toISOString() })
  return { botUsername: me.username }
}

export async function disconnectBot(shopId: string) {
  const db = await adminDb()
  const ref = db.collection('shopSecrets').doc(shopId)
  const token = String((await ref.get()).data()?.botToken || '')
  if (token) await call(token, 'deleteWebhook').catch(() => undefined)
  await ref.delete()
}
