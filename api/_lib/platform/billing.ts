import { adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { PLANS, TELEGRAM_ADDON, type PlanId } from '../../../src/platform/plans.js'
import { readShopState } from '../tenant.js'
import { uploadDataUrl } from './files.js'
import { esc, notifyPlatform } from './notify.js'
import { PlatformError } from './errors.js'

/**
 * Obuna to'lovi — kartaga o'tkazma + chek.
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
  plan: PlanId
  amount: number
  telegramAddon: boolean
  status: 'pending' | 'approved' | 'rejected'
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
    plan: (String(data.plan) in PLANS ? data.plan : 'month') as PlanId,
    amount: Number(data.amount) || 0,
    telegramAddon: data.telegramAddon === true,
    status: (['pending', 'approved', 'rejected'].includes(String(data.status)) ? data.status : 'pending') as PaymentRow['status'],
    receipt: String(data.receipt || ''),
    note: String(data.note || ''),
    reviewNote: String(data.reviewNote || ''),
    createdAt: String(data.createdAt || ''),
    reviewedAt: data.reviewedAt ? String(data.reviewedAt) : null,
    paidUntil: data.paidUntil ? String(data.paidUntil) : null,
  }
}

/** Egasi uchun: do'kon holati, platforma kartasi va to'lovlar tarixi. */
export async function billingStatus(staff: Staff) {
  const db = await adminDb()
  const [state, card, snap, shopSnap] = await Promise.all([
    readShopState(db, staff.shopId),
    platformCard(),
    db.collection('payments').where('shopId', '==', staff.shopId).get(),
    db.collection('shops').doc(staff.shopId).get(),
  ])
  const payments = snap.docs
    .map((doc) => toRow(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
  const shop = shopSnap.data() ?? {}
  return {
    status: state.status,
    paidUntil: state.paidUntil,
    plan: String(shop.plan || 'month'),
    telegramAddon: shop.telegramAddon === true,
    card,
    payments,
  }
}

export async function billingSubmit(staff: Staff, body: Record<string, unknown>) {
  if (staff.role !== 'owner') throw new PlatformError('To‘lovni faqat do‘kon egasi yubora oladi', 403)

  const plan = String(body.plan) as PlanId
  if (!(plan in PLANS)) throw new PlatformError('Tarif tanlanmagan')
  const telegramAddon = body.telegramAddon === true
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
    plan,
    amount,
    telegramAddon,
    addonUsd: telegramAddon ? TELEGRAM_ADDON.priceUsd : 0,
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
      `Tarif: ${PLANS[plan].name} — ${amount.toLocaleString('ru-RU')} so‘m${telegramAddon ? ` + Telegram $${TELEGRAM_ADDON.priceUsd}` : ''}`,
      note ? `Izoh: ${esc(note)}` : '',
      `Chek: ${url}`,
    ].filter(Boolean).join('\n'),
  )

  return { id: ref.id, status: 'pending' }
}

export { toRow as paymentRow }
