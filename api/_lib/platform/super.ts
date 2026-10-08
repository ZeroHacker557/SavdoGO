import type { VercelRequest } from '@vercel/node'
import { adminAuth, adminDb } from '../firebase-admin.js'
import { PLANS, type PlanId } from '../../../src/platform/plans.js'
import { paymentRow, platformCard } from './billing.js'
import { PlatformError } from './errors.js'
import { connectBot, disconnectBot } from './bot.js'
import { superRequests } from './owners.js'
import { runTx } from '../firestore-tx.js'
import { deleteShopCompletely } from './delete-shop.js'
import { createLoginLink } from './tglogin.js'
import { activatePaymentTx } from './activate.js'

/**
 * Platforma egasi (super-admin) amallari.
 *
 * Kirish — oddiy Firebase email/parol, huquq esa `super: true` custom
 * claim'ida. Uni faqat `scripts/create-super.mjs` qo'yadi — brauzerdan
 * yoki ro'yxatdan o'tish orqali olib bo'lmaydi.
 */
export type SuperUser = { uid: string; email: string }

export async function requireSuper(req: VercelRequest): Promise<SuperUser> {
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new PlatformError('Tizimga kirilmagan', 401)
  let decoded
  try {
    decoded = await (await adminAuth()).verifyIdToken(token, true)
  } catch {
    throw new PlatformError('Seans muddati tugagan — qaytadan kiring', 401)
  }
  if (decoded.super !== true) throw new PlatformError('Bu bo‘lim faqat platforma egasi uchun', 403)
  return { uid: decoded.uid, email: String(decoded.email || '') }
}

const DAY = 86_400_000

/** Hamma do'konlar, kutilayotgan va oxirgi to'lovlar — panelning bosh sahifasi. */
export async function superOverview() {
  const db = await adminDb()
  const [shopsSnap, privateSnap, paymentsSnap, card, requests] = await Promise.all([
    db.collection('shops').orderBy('createdAt', 'desc').limit(500).get(),
    db.collection('shopPrivate').get(),
    db.collection('payments').orderBy('createdAt', 'desc').limit(200).get(),
    platformCard(),
    superRequests(),
  ])
  const owners = new Map(privateSnap.docs.map((doc) => [doc.id, doc.data()]))
  const now = Date.now()

  const shops = shopsSnap.docs.map((doc) => {
    const data = doc.data()
    const owner = owners.get(doc.id) ?? {}
    const paidUntil = typeof data.paidUntil === 'string' ? data.paidUntil : null
    return {
      id: doc.id,
      name: String(data.name || doc.id),
      type: String(data.type || 'other'),
      logo: typeof data.logo === 'string' && !data.logo.startsWith('data:') ? data.logo : null,
      brand: String((data.theme as Record<string, unknown> | undefined)?.brand || '#4F46E5'),
      status: String(data.status || 'demo'),
      plan: String(data.plan || 'month'),
      paidUntil,
      trial: data.trial === true,
      expired: data.status === 'active' && !!paidUntil && new Date(paidUntil).getTime() <= now,
      telegramAddon: data.telegramAddon === true,
      botUsername: data.botUsername ? String(data.botUsername) : null,
      customDomain: data.customDomain ? String(data.customDomain) : null,
      city: String((data.contacts as Record<string, unknown> | undefined)?.city || ''),
      phone: String((data.contacts as Record<string, unknown> | undefined)?.phone || ''),
      createdAt: String(data.createdAt || ''),
      ownerName: String(owner.ownerName || ''),
      ownerEmail: String(owner.ownerEmail || ''),
      ownerPhone: String(owner.ownerPhone || ''),
    }
  })

  // Hamyon'ning ochiq/bekor bo'lgan to'lovlari — pul kelmagan, ro'yxatni to'ldirmasin
  const payments = paymentsSnap.docs.filter((doc) => !['awaiting', 'cancelled'].includes(String(doc.data().status))).map((doc) => ({
    ...paymentRow(doc.id, doc.data()),
    shopId: String(doc.data().shopId || ''),
    shopName: String(doc.data().shopName || ''),
  }))

  // Faol obunalardan oylik tushum (taxminiy): har tarif narxi oyga keltiriladi.
  // Bepul sinovdagilar hali pul to'lamagan — hisobga kirmaydi.
  const paying = shops.filter((s) => s.status === 'active' && !s.expired && !s.trial)
  const monthly = paying
    .reduce((sum, s) => sum + (PLANS[s.plan as PlanId]?.price ?? 0) * (30 / (PLANS[s.plan as PlanId]?.days ?? 30)), 0)

  const approvedThisMonth = payments
    .filter((p) => p.status === 'approved' && p.reviewedAt && p.reviewedAt.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, p) => sum + p.amount, 0)

  return {
    shops,
    payments,
    card,
    requests,
    stats: {
      total: shops.length,
      active: paying.length,
      trial: shops.filter((s) => s.status === 'active' && !s.expired && s.trial).length,
      demo: shops.filter((s) => s.status === 'demo').length,
      expired: shops.filter((s) => s.expired).length,
      pending: payments.filter((p) => p.status === 'pending').length,
      requests: requests.filter((r) => r.status === 'pending').length,
      monthlyRevenue: Math.round(monthly),
      approvedThisMonth,
    },
  }
}

/**
 * Chekni tasdiqlash: do'kon faollashadi, muddat qo'shiladi
 * (activate.ts). Tranzaksiyada: bir chek ikki marta tasdiqlanmasin.
 */
export async function paymentApprove(user: SuperUser, body: Record<string, unknown>) {
  const id = String(body.id || '')
  if (!id) throw new PlatformError('To‘lov tanlanmagan')
  const db = await adminDb()
  const paymentRef = db.collection('payments').doc(id)

  return runTx(db, async (tx) => {
    const paymentSnap = await tx.get(paymentRef)
    if (!paymentSnap.exists) throw new PlatformError('To‘lov topilmadi', 404)
    const payment = paymentSnap.data() ?? {}
    if (payment.status !== 'pending') throw new PlatformError('Bu to‘lov allaqachon ko‘rib chiqilgan', 409)
    return activatePaymentTx(db, tx, paymentRef, payment, user.email || user.uid)
  })
}

export async function paymentReject(user: SuperUser, body: Record<string, unknown>) {
  const id = String(body.id || '')
  if (!id) throw new PlatformError('To‘lov tanlanmagan')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : ''
  const db = await adminDb()
  const ref = db.collection('payments').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new PlatformError('To‘lov topilmadi', 404)
  if (snap.data()?.status !== 'pending') throw new PlatformError('Bu to‘lov allaqachon ko‘rib chiqilgan', 409)
  await ref.update({
    status: 'rejected',
    reviewNote: note || 'Chek tasdiqlanmadi',
    reviewedAt: new Date().toISOString(),
    reviewedBy: user.email || user.uid,
  })
  return { id }
}

function cleanDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!host) return null
  if (!/^(?=.{4,120}$)([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) throw new PlatformError('Domen noto‘g‘ri: masalan kafenur.uz')
  return host
}

/**
 * Do'konni qo'lda boshqarish: holat, muddat, o'z domeni, Telegram bot.
 * O'z domeni `domains/{host}` hujjatiga ham yoziladi — sayt shu orqali
 * qaysi do'konligini topadi.
 */
export async function shopUpdate(user: SuperUser, body: Record<string, unknown>) {
  const shopId = String(body.shopId || '')
  if (!shopId) throw new PlatformError('Do‘kon tanlanmagan')
  const db = await adminDb()
  const shopRef = db.collection('shops').doc(shopId)
  const snap = await shopRef.get()
  if (!snap.exists) throw new PlatformError('Do‘kon topilmadi', 404)
  const shop = snap.data() ?? {}
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: user.email || user.uid }

  if (body.status !== undefined) {
    const status = String(body.status)
    if (!['demo', 'active', 'blocked'].includes(status)) throw new PlatformError('Holat noto‘g‘ri')
    patch.status = status
  }

  if (body.extendDays !== undefined) {
    const days = Math.round(Number(body.extendDays))
    if (!Number.isFinite(days) || days < 1 || days > 3660) throw new PlatformError('Kunlar soni noto‘g‘ri')
    const current = typeof shop.paidUntil === 'string' ? new Date(shop.paidUntil).getTime() : 0
    patch.paidUntil = new Date(Math.max(Date.now(), current || 0) + days * DAY).toISOString()
    if (patch.status === undefined) patch.status = 'active'
  }

  if (body.telegramAddon !== undefined) patch.telegramAddon = body.telegramAddon === true
  if (body.botUsername !== undefined) {
    const bot = String(body.botUsername || '').trim().replace(/^@/, '')
    if (bot && !/^[a-zA-Z0-9_]{5,32}$/.test(bot)) throw new PlatformError('Bot username noto‘g‘ri')
    patch.botUsername = bot || null
  }

  // Bot tokeni: tekshiriladi, webhook va menyu tugmasi o'rnatiladi (platform/bot.ts).
  // «-» — botni uzish.
  if (typeof body.botToken === 'string' && body.botToken.trim()) {
    const token = body.botToken.trim()
    if (token === '-') {
      await disconnectBot(shopId)
      patch.botUsername = null
    } else {
      const customDomain = body.customDomain !== undefined ? cleanDomain(body.customDomain) : (shop.customDomain as string | null) ?? null
      const { botUsername } = await connectBot(shopId, token, String(shop.name || shopId), customDomain)
      patch.botUsername = botUsername
      patch.telegramAddon = true
    }
  }

  const batch = db.batch()
  if (body.customDomain !== undefined) {
    const domain = cleanDomain(body.customDomain)
    const previous = typeof shop.customDomain === 'string' ? shop.customDomain : null
    if (domain) {
      const taken = await db.collection('domains').doc(domain).get()
      if (taken.exists && taken.data()?.shopId !== shopId) throw new PlatformError('Bu domen boshqa do‘konga ulangan', 409)
      batch.set(db.collection('domains').doc(domain), { shopId, createdAt: new Date().toISOString() })
    }
    if (previous && previous !== domain) batch.delete(db.collection('domains').doc(previous))
    patch.customDomain = domain
  }

  batch.update(shopRef, patch)
  await batch.commit()
  return { shopId, ...patch }
}

/**
 * Do'konni butunlay o'chirish (delete-shop.ts). Tasodifiy bosishdan
 * himoya: `confirm` maydonida do'kon manzili (id) aynan yozilgan bo'lishi shart.
 */
export async function shopDelete(user: SuperUser, body: Record<string, unknown>) {
  const shopId = String(body.shopId || '').trim().toLowerCase()
  if (!shopId) throw new PlatformError('Do‘kon tanlanmagan')
  if (String(body.confirm || '').trim().toLowerCase() !== shopId) {
    throw new PlatformError(`Tasdiqlash uchun do‘kon manzilini aynan yozing: ${shopId}`)
  }
  const result = await deleteShopCompletely(shopId)
  console.log(`[super] ${user.email || user.uid} do‘konni o‘chirdi: ${shopId}`)
  return result
}

/**
 * Egasi kira olmay qolsa (Telegram ham, raqam ham, email ham yo'q) — siz
 * shaxsini tekshirib, shu 10 daqiqalik bir martalik havolani berasiz.
 * Havola egasini «Hisobim» bo'limiga olib boradi — u zaxira usul ulaydi.
 */
export async function shopLoginLink(user: SuperUser, body: Record<string, unknown>) {
  const shopId = String(body.shopId || '').trim().toLowerCase()
  const db = await adminDb()
  const shop = (await db.collection('shops').doc(shopId).get()).data()
  const ownerUid = typeof shop?.ownerUid === 'string' ? shop.ownerUid : ''
  if (!ownerUid) throw new PlatformError('Do‘kon egasi topilmadi', 404)
  const url = await createLoginLink(ownerUid)
  console.log(`[super] ${user.email || user.uid} kirish havolasi yaratdi: ${shopId}`)
  return { url: `${url}&open=account` }
}

export async function settingsSave(user: SuperUser, body: Record<string, unknown>) {
  const digits = String(body.cardNumber || '').replace(/\D/g, '')
  if (digits && digits.length !== 16) throw new PlatformError('Karta raqami 16 ta raqamdan iborat')
  const db = await adminDb()
  const data = {
    cardNumber: digits.replace(/(\d{4})(?=\d)/g, '$1 '),
    cardOwner: String(body.cardOwner || '').trim().toUpperCase().slice(0, 80),
    note: String(body.note || '').trim().slice(0, 300),
    updatedAt: new Date().toISOString(),
    updatedBy: user.email || user.uid,
  }
  await db.collection('platform').doc('settings').set(data, { merge: true })
  return data
}
