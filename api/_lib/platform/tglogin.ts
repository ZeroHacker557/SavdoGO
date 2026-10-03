import { createHash, randomBytes } from 'node:crypto'
import { adminAuth, adminDb } from '../firebase-admin.js'
import { verifyInitData, type TelegramUser } from '../telegram-auth.js'
import { loadShopContext } from '../context.js'
import { runTx } from '../firestore-tx.js'
import { PlatformError } from './errors.js'
import { esc } from './notify.js'
import { newSecret, ownerShop, platformToken, publicBase, readTgUser, sendText, tgCall, type TgUserDoc } from './tgbot.js'

/**
 * Parolsiz kirish — Telegram orqali ochilgan egalar uchun (email/parol yo'q).
 *
 *   1. Telegram ichida: panel initData yuboradi → imzo SavdoGO boti (yoki
 *      do'kon boti) tokeni bilan tekshiriladi → Firebase custom token.
 *   2. Botdagi «💻 Kompyuterda ochish»: 10 daqiqalik, bir martalik havola
 *      (`loginCodes/{sha256}` — xom kod hech qayerda saqlanmaydi).
 *   3. Kompyuterdagi kirish oynasi: «Telegram orqali kirish» → botda
 *      /start login_<nonce> → ega ekrandagi 4 xonali kodni ko'rib
 *      tasdiqlaydi → oyna o'zi kiradi (`loginRequests/{nonce}`).
 *      Kod — begona odam o'z havolasini egaga bostirib, uning nomidan
 *      kirib olmasligi uchun (ega faqat o'z ekranidagi kodni tasdiqlaydi).
 */

const LINK_TTL = 10 * 60_000
const REQUEST_TTL = 5 * 60_000

async function customToken(uid: string): Promise<string> {
  return (await adminAuth()).createCustomToken(uid)
}

/* ─── 1. Telegram ichida ──────────────────────────────────── */

function tryVerify(initData: string, token: string | null | undefined): TelegramUser | null {
  if (!token) return null
  try {
    return verifyInitData(initData, token)
  } catch {
    return null
  }
}

/**
 * Admin panel Telegram ichida ochilganda — xodimni parolsiz kiritadi.
 * Avval SavdoGO boti (egalar), keyin do'kon boti (do'kondagi xodimlar,
 * Telegram ID si biriktirilgan bo'lsa).
 */
export async function telegramStaffLogin(body: Record<string, unknown>) {
  const initData = typeof body.initData === 'string' ? body.initData : ''
  if (!initData) throw new PlatformError('Telegram ma’lumoti yo‘q', 400)

  const viaPlatform = tryVerify(initData, platformToken())
  if (viaPlatform) {
    const tg = await readTgUser(viaPlatform.id)
    if (tg.uid) return { token: await customToken(tg.uid) }
  }

  const shopId = typeof body.shopId === 'string' ? body.shopId.trim().toLowerCase() : ''
  const context = shopId ? await loadShopContext(shopId).catch(() => null) : null
  const viaShop = context ? tryVerify(initData, context.botToken) : null
  if (viaShop && context) {
    const db = await adminDb()
    const snap = await db.collection('shops').doc(context.shopId).collection('staff').where('telegramId', '==', viaShop.id).limit(1).get()
    const doc = snap.docs[0]
    if (doc && doc.data().active !== false) return { token: await customToken(doc.id) }
  }

  if (!viaPlatform && !viaShop) throw new PlatformError('Telegram imzosi tasdiqlanmadi', 401)
  throw new PlatformError('Bu Telegram hisobi hech bir do‘konga biriktirilmagan', 404, 'not-linked')
}

/** Formani Telegram ichida ochganda: ism, tasdiqlangan telefon va mavjud do'kon. */
export async function tgMe(body: Record<string, unknown>) {
  const initData = typeof body.initData === 'string' ? body.initData : ''
  const user = tryVerify(initData, platformToken())
  if (!user) throw new PlatformError('Telegram imzosi tasdiqlanmadi — formani SavdoGO botidan oching', 401, 'tg-invalid')
  const tg = await readTgUser(user.id)
  const shop = tg.uid ? await ownerShop(tg.uid) : null
  return {
    firstName: user.first_name,
    lastName: user.last_name ?? null,
    phone: tg.phone ?? null,
    shop: shop ? { id: shop.id, name: String(shop.name || shop.id) } : null,
  }
}

/* ─── 2. Bir martalik havola ──────────────────────────────── */

export async function createLoginLink(uid: string): Promise<string> {
  const { raw, hash } = newSecret()
  const db = await adminDb()
  await db.collection('loginCodes').doc(hash).set({
    uid,
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now() + LINK_TTL),
  })
  return `${publicBase()}/admin?login=${raw}`
}

export async function redeemLoginCode(body: Record<string, unknown>) {
  const raw = typeof body.loginCode === 'string' ? body.loginCode.trim() : ''
  if (!raw) throw new PlatformError('Havola noto‘g‘ri', 400)
  const db = await adminDb()
  const ref = db.collection('loginCodes').doc(createHash('sha256').update(raw).digest('hex'))
  const uid = await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data()
    if (!data) return ''
    tx.delete(ref)
    const expires = (data.expireAt as { toMillis?: () => number })?.toMillis?.() ?? 0
    return expires > Date.now() ? String(data.uid || '') : ''
  })
  if (!uid) throw new PlatformError('Havola eskirgan yoki ishlatilgan — botdagi «💻 Kompyuterda ochish» tugmasidan yangisini oling', 410, 'login-expired')
  return { token: await customToken(uid) }
}

/* ─── 3. Kompyuterdagi kirish oynasi ──────────────────────── */

/** Ekranda va botda ko'rinadigan 4 xonali kod — ikkalasi bir xilmi, ega solishtiradi. */
function matchCode(nonce: string): string {
  return String(parseInt(createHash('sha256').update(nonce).digest('hex').slice(0, 8), 16) % 10000).padStart(4, '0')
}

let cachedUsername = ''
async function platformUsername(): Promise<string> {
  if (!cachedUsername) cachedUsername = (await tgCall<{ username: string }>('getMe', {}))?.username ?? ''
  return cachedUsername
}

export async function startLoginRequest() {
  const botUsername = await platformUsername()
  if (!botUsername) throw new PlatformError('Telegram orqali kirish hali sozlanmagan', 503, 'tg-off')
  const nonce = randomBytes(12).toString('base64url')
  await (await adminDb()).collection('loginRequests').doc(nonce).set({
    status: 'pending',
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now() + REQUEST_TTL),
  })
  return { nonce, code: matchCode(nonce), botUsername, link: `https://t.me/${botUsername}?start=login_${nonce}`, ttl: REQUEST_TTL }
}

export async function pollLoginRequest(body: Record<string, unknown>) {
  const nonce = typeof body.nonce === 'string' ? body.nonce : ''
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(nonce)) throw new PlatformError('So‘rov noto‘g‘ri', 400)
  const db = await adminDb()
  const ref = db.collection('loginRequests').doc(nonce)
  const result = await runTx(db, async (tx) => {
    const data = (await tx.get(ref)).data()
    if (!data) return { status: 'expired' as const }
    const expires = (data.expireAt as { toMillis?: () => number })?.toMillis?.() ?? 0
    if (expires < Date.now()) {
      tx.delete(ref)
      return { status: 'expired' as const }
    }
    if (data.status !== 'approved' || !data.uid) return { status: 'pending' as const }
    tx.delete(ref)
    return { status: 'approved' as const, uid: String(data.uid) }
  })
  if (result.status !== 'approved') return { status: result.status }
  return { status: 'approved', token: await customToken(result.uid) }
}

/** Botda /start login_<nonce> — ega kodni ko'rib tasdiqlashi kerak. */
export async function approveLoginRequest(chatId: number, _from: { id: number }, user: TgUserDoc, nonce: string) {
  if (!user.uid) {
    await sendText(chatId, 'Bu Telegram hisobida do‘kon yo‘q. Avval do‘kon oching — /start')
    return
  }
  const data = (await (await adminDb()).collection('loginRequests').doc(nonce).get()).data()
  const expires = (data?.expireAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0
  if (!data || data.status !== 'pending' || expires < Date.now()) {
    await sendText(chatId, 'Kirish so‘rovi eskirgan. Kompyuterdagi oynada «Telegram orqali kirish» ni qayta bosing.')
    return
  }
  await sendText(
    chatId,
    [
      '💻 <b>Kompyuterda kirish</b>',
      '',
      `Ekrandagi kod: <b>${esc(matchCode(nonce))}</b>`,
      '',
      'Kod kompyuteringizdagi bilan bir xil bo‘lsa va oynani o‘zingiz ochgan bo‘lsangiz — tasdiqlang.',
      'Begona odam yuborgan havola bo‘lsa, BOSMANG.',
    ].join('\n'),
    [[{ text: '✅ Ha, bu men', callback_data: `login:${nonce}` }]],
  )
}

export async function confirmLoginRequest(chatId: number, uid: string, nonce: string) {
  const db = await adminDb()
  const ref = db.collection('loginRequests').doc(nonce)
  const ok = await runTx(db, async (tx) => {
    const data = (await tx.get(ref)).data()
    const expires = (data?.expireAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0
    if (!data || data.status !== 'pending' || expires < Date.now()) return false
    tx.update(ref, { status: 'approved', uid, approvedAt: new Date().toISOString() })
    return true
  })
  await sendText(chatId, ok ? '✅ Tasdiqlandi — kompyuterdagi oyna o‘zi ochiladi.' : 'Kirish so‘rovi eskirgan. Kompyuterda qayta urinib ko‘ring.')
}
