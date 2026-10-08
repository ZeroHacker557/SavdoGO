import { adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { PLANS, type PlanId } from '../../../src/platform/plans.js'
import { readShopState } from '../tenant.js'
import { uploadDataUrl } from './files.js'
import { esc, notifyPlatform } from './notify.js'
import { PlatformError } from './errors.js'
import { hamyonKeys, reconcile, type Invoice } from './hamyon.js'

/**
 * Obuna to'lovi — kartaga o'tkazma + chek.
 *
 * (Avtomatik usul — Hamyon API, hamyon.ts: pul tushishi bilan do'kon
 * o'zi faollashadi. Chek usuli zaxira sifatida qoladi.)
 *
 *   1. Ega admin paneldagi «To'lov» bo'limida tarifni tanlaydi,
 *      platforma kartasiga pul o'tkazadi va chek rasmini yuklaydi.
 *   2. `payments/{id}` hujjati `pending` holatida yaratiladi, platforma
 *      egasiga Telegram xabari boradi.
 *   3. Super-admin tasdiqlaydi (super.ts) — do'kon `active` bo'ladi,
 *      muddat eski muddat ustiga qo'shiladi.
 */

export type PlatformCard = { cardNumber: string; cardOwner: string; note: string }

export async function platformCard(): Promise<PlatformCard> {
  const db = await adminDb()
  const snap = await db.collection('platform').doc('settings').get()
  const data = snap.data() ?? {}
  return {
    cardNumber: String(data.cardNumber || process.env.PLATFORM_CARD_NUMBER || ''),
    cardOwner: String(data.cardOwner || process.env.PLATFORM_CARD_OWNER || ''),
    note: String(data.note || ''),
  }
}

type PaymentRow = {
  id: string
  /** `receipt` — chek bilan (qo'lda tasdiq), `hamyon` — avtomatik. */
  method: 'receipt' | 'hamyon'
  plan: PlanId
  amount: number
  telegramAddon: boolean
  /** `awaiting`/`cancelled` — faqat Hamyon: to'lov kutilmoqda / pul kelmadi. */
  status: 'pending' | 'approved' | 'rejected' | 'awaiting' | 'cancelled'
  receipt: string
  note: string
  reviewNote: string
  createdAt: string
  reviewedAt: string | null
  paidUntil: string | null
}

function toRow(id: string, data: Record<string, unknown>): PaymentRow {
  return {
    id,
    method: data.method === 'hamyon' ? 'hamyon' : 'receipt',
    plan: (String(data.plan) in PLANS ? data.plan : 'month') as PlanId,
    amount: Number(data.amount) || 0,
    telegramAddon: data.telegramAddon === true,
    status: (['pending', 'approved', 'rejected', 'awaiting', 'cancelled'].includes(String(data.status)) ? data.status : 'pending') as PaymentRow['status'],
    receipt: String(data.receipt || ''),
    note: String(data.note || ''),
    reviewNote: String(data.reviewNote || ''),
    createdAt: String(data.createdAt || ''),
    reviewedAt: data.reviewedAt ? String(data.reviewedAt) : null,
    paidUntil: data.paidUntil ? String(data.paidUntil) : null,
  }
}

/**
 * Egasi uchun: do'kon holati, platforma kartasi, ochiq Hamyon to'lovi
 * va to'lovlar tarixi. Ochiq to'lov bo'lsa holati Hamyondan so'raladi —
 * sahifa kutib turganda har necha soniyada chaqiriladi.
 */
export async function billingStatus(staff: Staff) {
  const db = await adminDb()
  const paymentsQuery = db.collection('payments').where('shopId', '==', staff.shopId)
  let snap = await paymentsQuery.get()
  const awaiting = snap.docs.filter((doc) => doc.data().status === 'awaiting')
  if (awaiting.length && hamyonKeys()) {
    await Promise.all(awaiting.map((doc) => reconcile(db, doc)))
    snap = await paymentsQuery.get()
  }

  const [state, card, shopSnap] = await Promise.all([
    readShopState(db, staff.shopId),
    platformCard(),
    db.collection('shops').doc(staff.shopId).get(),
  ])
  const rows = snap.docs
    .map((doc) => ({ row: toRow(doc.id, doc.data()), data: doc.data() }))
    .sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt))
  const open = rows.find((r) => r.row.status === 'awaiting')
  const invoice: Invoice | null = open
    ? {
        id: open.row.id,
        plan: open.row.plan,
        amount: open.row.amount,
        card: String(open.data.card || ''),
        expireAt: String(open.data.expireAt || ''),
      }
    : null
  // Pul kelmagan Hamyon urinishlari tarixga kirmaydi
  const payments = rows
    .map((r) => r.row)
    .filter((p) => p.status !== 'awaiting' && p.status !== 'cancelled')
    .slice(0, 20)
  const shop = shopSnap.data() ?? {}
  return {
    status: state.status,
    paidUntil: state.paidUntil,
    plan: String(shop.plan || 'month'),
    telegramAddon: shop.telegramAddon === true,
    card,
    /** Avtomatik to'lov (Hamyon) yoqilganmi — kalitlar Vercel env'da. */
    hamyon: hamyonKeys() !== null,
    invoice,
    payments,
  }
}

export async function billingSubmit(staff: Staff, body: Record<string, unknown>) {
  if (staff.role !== 'owner') throw new PlatformError('To‘lovni faqat do‘kon egasi yubora oladi', 403)

  const plan = String(body.plan) as PlanId
  if (!(plan in PLANS)) throw new PlatformError('Tarif tanlanmagan')
  const receipt = typeof body.receipt === 'string' ? body.receipt : ''
  if (!receipt.startsWith('data:image/')) throw new PlatformError('Chek rasmini yuklang')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : ''

  const db = await adminDb()
  const state = await readShopState(db, staff.shopId)
  if (!state.exists) throw new PlatformError('Do‘kon topilmadi', 404)

  // Tasdiqlanmagan cheklar ko'payib ketmasin
  const pending = await db
    .collection('payments')
    .where('shopId', '==', staff.shopId)
    .where('status', '==', 'pending')
    .get()
  if (pending.size >= 3) {
    throw new PlatformError('Oldingi cheklaringiz hali tekshirilmoqda. Tasdiqlanishini kuting.', 429, 'too-many-pending')
  }

  const ref = db.collection('payments').doc()
  const url = await uploadDataUrl(receipt, `payments/${staff.shopId}/${ref.id}`, 6 * 1024 * 1024)
  const amount = PLANS[plan].price
  const now = new Date().toISOString()

  await ref.set({
    shopId: staff.shopId,
    shopName: state.name,
    method: 'receipt',
    plan,
    amount,
    receipt: url,
    note,
    status: 'pending',
    createdAt: now,
    createdBy: staff.uid,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
  })

  void notifyPlatform(
    [
      '💳 <b>Yangi to‘lov cheki</b>',
      `${esc(state.name)} (${staff.shopId})`,
      `Tarif: ${PLANS[plan].name} — ${amount.toLocaleString('ru-RU')} so‘m`,
      note ? `Izoh: ${esc(note)}` : '',
      `Chek: ${url}`,
    ].filter(Boolean).join('\n'),
  )

  return { id: ref.id, status: 'pending' }
}

export { toRow as paymentRow }
