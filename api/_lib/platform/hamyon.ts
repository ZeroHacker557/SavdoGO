import { createHash, timingSafeEqual } from 'node:crypto'
import type { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore'
import { adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { runTx } from '../firestore-tx.js'
import { PLANS, type PlanId } from '../../../src/platform/plans.js'
import { readShopState } from '../tenant.js'
import { activatePaymentTx } from './activate.js'
import { esc, notifyPlatform } from './notify.js'
import { PlatformError } from './errors.js'

/**
 * Avtomatik obuna to'lovi — Hamyon API (https://hamyon-api.uz).
 *
 *   1. Ega tarifni tanlab «To'lash» ni bosadi → `payments/{id}`
 *      (`method: 'hamyon'`, `status: 'awaiting'`) yaratiladi va
 *      POST /payment/create ga `order_id = id` bilan so'rov ketadi.
 *      Javobda karta raqami keladi — ega aynan shu summani o'tkazadi.
 *   2. Hamyon kartani o'zi kuzatadi: pul tushsa complete_url ga
 *      `status=paid`, 5 daqiqada tushmasa `status=cancel` keladi.
 *      Callback manzili: https://savdogo.shop/api/platform?hamyon=complete
 *      (prepare_url ham shu yerga: ?hamyon=prepare) — @HamyonAPIBot da
 *      do'kon sozlamalarida ko'rsatiladi.
 *   3. `paid` — do'kon darhol faollashadi (super-admin tasdig'isiz).
 *      Callback yetib bormasa ham, to'lov sahifasi ochiq turganda
 *      billing.status GET /payment/status orqali holatni o'zi tekshiradi.
 *
 * To'lov SUMMA bo'yicha aniqlanadi: bitta merchantda bir xil summadagi
 * ikkita ochiq to'lov bo'lolmaydi. Hamma do'konlar bitta SavdoGO
 * merchanti orqali to'lagani uchun band summa 1 so'mga oshiriladi
 * (199 000 → 199 001).
 *
 * Kalitlar faqat serverda: HAMYON_SHOP_ID, HAMYON_SHOP_KEY (Vercel env).
 * Ular bo'lmasa avtomatik to'lov o'chiq — eski «chek yuborish» ishlaydi.
 */

const TIMEOUT_MS = 15_000
/** Hamyon to'lovni shuncha vaqt kutadi (javobda expires_in kelmasa). */
const INVOICE_TTL_MS = 5 * 60_000
/** Bir xil summa band bo'lsa, shuncha so'mgacha oshirib ko'riladi. */
const MAX_AMOUNT_SHIFT = 50

type Keys = { shopId: string; shopKey: string }

export function hamyonKeys(): Keys | null {
  const shopId = (process.env.HAMYON_SHOP_ID || '').trim()
  const shopKey = (process.env.HAMYON_SHOP_KEY || '').trim()
  return shopId && shopKey ? { shopId, shopKey } : null
}

function apiBase(): string {
  // HAMYON_API_URL — faqat lokal sinov (soxta server) uchun
  return (process.env.HAMYON_API_URL || 'https://hamyon-api.uz').replace(/\/+$/, '')
}

class HamyonError extends Error {}

async function hamyonFetch(path: string, form?: Record<string, string>): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: form ? 'POST' : 'GET',
      headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    throw new HamyonError(error instanceof Error && error.name === 'TimeoutError' ? 'javob kelmadi' : 'ulanib bo‘lmadi')
  }
  const text = await response.text()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new HamyonError(`kutilmagan javob (${response.status})`)
  }
  if (!response.ok || data.error) throw new HamyonError(String(data.error || `HTTP ${response.status}`))
  return data
}

/** Ega uchun ochiq to'lov ko'rinishi (karta, summa, muddat). */
export type Invoice = { id: string; plan: PlanId; amount: number; card: string; expireAt: string }

function invoiceView(id: string, data: Record<string, unknown>): Invoice {
  return {
    id,
    plan: (String(data.plan) in PLANS ? data.plan : 'month') as PlanId,
    amount: Number(data.amount) || 0,
    card: String(data.card || ''),
    expireAt: String(data.expireAt || ''),
  }
}

function isExpired(data: Record<string, unknown>, now = Date.now()): boolean {
  const at = Date.parse(String(data.expireAt || ''))
  return !Number.isFinite(at) || at <= now
}

/* ── To'lov yaratish / bekor qilish (do'kon egasi) ─────────────────── */

const ALERT_EVERY_MS = 10 * 60_000
let lastAlertAt = 0

/**
 * Hamyon to'lov yarata olmadi (sessiya ulanmagan, kalit noto'g'ri,
 * server javob bermadi...). Ega buni tuzata olmaydi — unga oddiy matn
 * va chek usuli, platforma egasiga esa haqiqiy sabab (10 daqiqada
 * ko'pi bilan bir marta, har bosishda emas).
 */
function unavailable(reason: string, shopName: string, shopId: string): PlatformError {
  console.error('[hamyon] create xato:', reason)
  if (Date.now() - lastAlertAt > ALERT_EVERY_MS) {
    lastAlertAt = Date.now()
    void notifyPlatform(
      [
        '⚠️ <b>Hamyon: avtomatik to‘lov ishlamadi</b>',
        `Sabab: ${esc(reason)}`,
        `Do‘kon: ${esc(shopName)} (${esc(shopId)}) — egaga chek usuli taklif qilindi.`,
        '@HamyonAPIBot sozlamalarini tekshiring.',
      ].join('\n'),
    )
  }
  return new PlatformError(
    'Avtomatik to‘lov hozir ishlamayapti. Iltimos, kartaga o‘tkazib chek yuboring — tez tasdiqlaymiz.',
    503,
    'hamyon-unavailable',
  )
}

export async function hamyonCreate(staff: Staff, body: Record<string, unknown>): Promise<Invoice> {
  if (staff.role !== 'owner') throw new PlatformError('To‘lovni faqat do‘kon egasi qila oladi', 403)
  const keys = hamyonKeys()
  if (!keys) throw new PlatformError('Avtomatik to‘lov hali ulanmagan — chek orqali to‘lang', 503, 'hamyon-off')
  const plan = String(body.plan) as PlanId
  if (!(plan in PLANS)) throw new PlatformError('Tarif tanlanmagan')

  const db = await adminDb()
  const state = await readShopState(db, staff.shopId)
  if (!state.exists) throw new PlatformError('Do‘kon topilmadi', 404)

  // Ochiq to'lov bo'lsa — o'shani qaytaramiz (sahifa yangilangan, ikki marta bosilgan)
  const open = await db
    .collection('payments')
    .where('shopId', '==', staff.shopId)
    .where('status', '==', 'awaiting')
    .get()
  for (const doc of open.docs) {
    const data = doc.data()
    if (!isExpired(data)) {
      if (data.plan === plan) return invoiceView(doc.id, data)
      throw new PlatformError('Avval ochiq to‘lovni bekor qiling', 409, 'hamyon-open')
    }
    // Muddati o'tgan — balki pul tushgandir, Hamyondan so'raymiz
    await reconcile(db, doc)
  }

  // Boshqa do'konlarning ochiq to'lovlari band qilgan summalar
  const busySnap = await db.collection('payments').where('status', '==', 'awaiting').get()
  const busy = new Set(busySnap.docs.filter((d) => !isExpired(d.data())).map((d) => Number(d.data().amount)))

  const base = PLANS[plan].price
  let lastError = ''
  for (let shift = 0, tries = 0; shift <= MAX_AMOUNT_SHIFT && tries < 5; shift++) {
    const amount = base + shift
    if (busy.has(amount)) continue
    tries++

    // Hujjat so'rovdan OLDIN yoziladi: prepare callback create javobidan oldin kelishi mumkin
    const ref = db.collection('payments').doc()
    const createdAt = new Date().toISOString()
    await ref.set({
      shopId: staff.shopId,
      shopName: state.name,
      method: 'hamyon',
      plan,
      amount,
      receipt: '',
      note: '',
      status: 'awaiting',
      createdAt,
      createdBy: staff.uid,
      expireAt: new Date(Date.now() + INVOICE_TTL_MS).toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: '',
    })

    let result: Record<string, unknown>
    try {
      result = await hamyonFetch('/payment/create', {
        shop_id: keys.shopId,
        shop_key: keys.shopKey,
        amount: String(amount),
        order_id: ref.id,
      })
    } catch (error) {
      await ref.delete().catch(() => undefined)
      lastError = error instanceof Error ? error.message : String(error)
      // Shu summada ochiq to'lov bor — keyingi so'mni sinaymiz
      if (/summa|ochiq|mavjud/i.test(lastError)) continue
      throw unavailable(lastError, state.name, staff.shopId)
    }

    const card = String(result.card || '').trim()
    const paymentId = String(result.payment_id || '').trim()
    if (!card || !paymentId) {
      await ref.delete().catch(() => undefined)
      throw unavailable('karta raqami yoki payment_id qaytmadi', state.name, staff.shopId)
    }
    const expireAt = Number(result.expire_at) > 0
      ? new Date(Number(result.expire_at) * 1000).toISOString()
      : new Date(Date.now() + (Number(result.expires_in) > 0 ? Number(result.expires_in) * 1000 : INVOICE_TTL_MS)).toISOString()
    const patch = { hamyonPaymentId: paymentId, card, expireAt }
    await ref.set(patch, { merge: true })
    return invoiceView(ref.id, { plan, amount, ...patch })
  }

  console.error('[hamyon] bo‘sh summa topilmadi:', lastError)
  throw new PlatformError('Hozir to‘lov yaratib bo‘lmadi — bir daqiqadan keyin qayta urinib ko‘ring', 503, 'hamyon-busy')
}

export async function hamyonCancel(staff: Staff, body: Record<string, unknown>) {
  if (staff.role !== 'owner') throw new PlatformError('To‘lovni faqat do‘kon egasi bekor qila oladi', 403)
  const id = String(body.id || '')
  if (!id) throw new PlatformError('To‘lov tanlanmagan')
  const db = await adminDb()
  const ref = db.collection('payments').doc(id)
  const snap = await ref.get()
  const data = snap.data()
  if (!snap.exists || !data || data.shopId !== staff.shopId || data.method !== 'hamyon') {
    throw new PlatformError('To‘lov topilmadi', 404)
  }
  if (data.status !== 'awaiting') return { id, status: String(data.status) }

  const keys = hamyonKeys()
  if (keys && data.hamyonPaymentId) {
    try {
      await hamyonFetch('/payment/cancel', {
        shop_id: keys.shopId,
        shop_key: keys.shopKey,
        payment_id: String(data.hamyonPaymentId),
      })
    } catch (error) {
      // Allaqachon yopilgan bo'lishi mumkin — baribir o'zimizda yopamiz
      console.warn('[hamyon] cancel:', error instanceof Error ? error.message : error)
    }
  }
  await markCancelled(db, ref, 'owner')
  return { id, status: 'cancelled' }
}

/* ── Holatni qo'llash ──────────────────────────────────────────────── */

/**
 * Pul tushdi: do'kon faollashadi. Callback bir necha marta kelishi
 * mumkin — `approved` bo'lsa hech narsa qilinmaydi (muddat ikki marta
 * qo'shilmaydi). Bekor qilingan to'lovga keyin pul kelsa ham qabul
 * qilinadi: pul baribir kartaga tushgan.
 */
async function settlePaid(db: Firestore, ref: DocumentReference, received: number) {
  const outcome = await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    const payment = snap.data()
    if (!snap.exists || !payment || payment.method !== 'hamyon') return null
    if (payment.status !== 'awaiting' && payment.status !== 'cancelled') return null

    const paidAt = new Date().toISOString()
    // Summani o'z bazamizdan olamiz; mos kelmasa — qo'lda tekshirish uchun
    if (received !== Number(payment.amount)) {
      tx.update(ref, {
        status: 'pending',
        hamyonPaidAt: paidAt,
        note: `Hamyon: ${received} so‘m keldi, kutilgani ${payment.amount} so‘m — tekshiring`,
      })
      return { kind: 'mismatch' as const, payment }
    }
    const result = await activatePaymentTx(db, tx, ref, payment, 'hamyon')
    tx.update(ref, { hamyonPaidAt: paidAt })
    return { kind: 'paid' as const, payment, paidUntil: result.paidUntil }
  })
  if (!outcome) return

  const { payment } = outcome
  const plan = PLANS[payment.plan as PlanId]
  void notifyPlatform(
    outcome.kind === 'paid'
      ? [
          '✅ <b>Avtomatik to‘lov (Hamyon)</b>',
          `${esc(String(payment.shopName || ''))} (${esc(String(payment.shopId))})`,
          `Tarif: ${plan?.name ?? payment.plan} — ${Number(payment.amount).toLocaleString('ru-RU')} so‘m`,
          `Faol: ${outcome.paidUntil.slice(0, 10)} gacha`,
        ].join('\n')
      : [
          '⚠️ <b>Hamyon: summa mos emas</b>',
          `${esc(String(payment.shopName || ''))} (${esc(String(payment.shopId))})`,
          `Keldi: ${received} so‘m, kutilgan: ${payment.amount} so‘m. /super da tekshiring.`,
        ].join('\n'),
  )
}

async function markCancelled(db: Firestore, ref: DocumentReference, reason: string) {
  await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    // Faqat ochiq to'lov — to'langanini «bekor» qilib qo'ymaslik uchun tranzaksiyada
    if (snap.data()?.status !== 'awaiting') return
    tx.update(ref, { status: 'cancelled', cancelReason: reason, reviewedAt: new Date().toISOString() })
  })
}

/**
 * Callback kelmagan bo'lsa ham holatni bilish: GET /payment/status.
 * Ega to'lov sahifasida kutib turganda billing.status shu bilan
 * tekshiradi — lokal sinovda (callback localhost'ga kelmaydi) ham ishlaydi.
 */
export async function reconcile(db: Firestore, doc: DocumentSnapshot): Promise<void> {
  const data = doc.data()
  if (!data || data.method !== 'hamyon' || data.status !== 'awaiting') return
  if (!data.hamyonPaymentId) {
    // create javobi kelmay qolgan — muddati o'tgach yopamiz
    if (isExpired(data, Date.now() - 60_000)) await markCancelled(db, doc.ref, 'no-payment-id')
    return
  }
  let status: Record<string, unknown>
  try {
    status = await hamyonFetch(`/payment/status?payment_id=${encodeURIComponent(String(data.hamyonPaymentId))}`)
  } catch (error) {
    console.warn('[hamyon] status:', error instanceof Error ? error.message : error)
    return
  }
  if (status.status === 'paid') await settlePaid(db, doc.ref, Number(status.amount))
  else if (status.status === 'cancel') await markCancelled(db, doc.ref, 'timeout')
}

/* ── Callback: Hamyon → bizning server ─────────────────────────────── */

function readForm(body: unknown): Record<string, string> {
  if (typeof body === 'string') return Object.fromEntries(new URLSearchParams(body))
  if (body && typeof body === 'object') {
    return Object.fromEntries(Object.entries(body as Record<string, unknown>).map(([k, v]) => [k, v == null ? '' : String(v)]))
  }
  return {}
}

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * prepare / complete callback. Imzo: md5(shop_id + payment_id + amount + shop_key).
 * 2xx qaytmasa Hamyon qayta yuboradi (3, 10, 30, 60 s) — shuning uchun
 * tanish bo'lmagan to'lovga ham 200 qaytadi, faqat imzo xatosiga 403.
 */
export async function hamyonCallback(body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = hamyonKeys()
  if (!keys) return { status: 503, body: { error: 'hamyon sozlanmagan' } }

  const form = readForm(body)
  const paymentId = form.payment_id || ''
  const amount = form.amount || ''
  const expected = createHash('md5').update(keys.shopId + paymentId + amount + keys.shopKey).digest('hex')
  if (!paymentId || !sameHex(expected, (form.sign || '').toLowerCase()) || (form.shop_id && form.shop_id !== keys.shopId)) {
    console.warn('[hamyon] imzo noto‘g‘ri:', paymentId)
    return { status: 403, body: { error: 'imzo' } }
  }

  const db = await adminDb()
  let doc: DocumentSnapshot | null = null
  if (form.order_id) {
    const snap = await db.collection('payments').doc(form.order_id).get()
    if (snap.exists) doc = snap
  }
  if (!doc) {
    const found = await db.collection('payments').where('hamyonPaymentId', '==', paymentId).limit(1).get()
    doc = found.docs[0] ?? null
  }
  const data = doc?.data()
  if (!doc || !data || data.method !== 'hamyon' || (data.hamyonPaymentId && data.hamyonPaymentId !== paymentId)) {
    console.warn('[hamyon] to‘lov topilmadi:', paymentId, form.order_id, form.status)
    return { status: 200, body: { result: 'ok' } }
  }

  if (!data.hamyonPaymentId) await doc.ref.set({ hamyonPaymentId: paymentId }, { merge: true })

  if (form.status === 'paid') await settlePaid(db, doc.ref, Number(amount))
  else if (form.status === 'cancel') await markCancelled(db, doc.ref, form.reason || 'cancel')
  // prepare — faqat xabar, hech narsa berilmaydi

  return { status: 200, body: { result: 'ok' } }
}
