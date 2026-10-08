import type { DocumentData, DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore'
import { PLANS, type PlanId } from '../../../src/platform/plans.js'
import { PlatformError } from './errors.js'

const DAY = 86_400_000

/**
 * To'lov qabul qilindi — do'kon faollashadi, muddat qo'shiladi.
 *
 * Super-admin chekni tasdiqlaganda (super.ts) ham, Hamyon avtomatik
 * to'lovida (hamyon.ts) ham shu. Muddat hozirgi muddat tugaydigan
 * kundan (yoki bugundan, agar tugab bo'lgan bo'lsa) hisoblanadi —
 * muddatidan oldin to'lagan ega kun yo'qotmaydi (bepul sinov kunlari
 * ham). Tranzaksiya ichida chaqiriladi: to'lov hujjati allaqachon
 * o'qilgan, do'kon shu yerda o'qiladi.
 */
export async function activatePaymentTx(
  db: Firestore,
  tx: Transaction,
  paymentRef: DocumentReference,
  payment: DocumentData,
  reviewer: string,
): Promise<{ shopId: string; paidUntil: string }> {
  const shopRef = db.collection('shops').doc(String(payment.shopId))
  const shopSnap = await tx.get(shopRef)
  if (!shopSnap.exists) throw new PlatformError('Do‘kon topilmadi', 404)
  const shop = shopSnap.data() ?? {}

  const plan = (String(payment.plan) in PLANS ? payment.plan : 'month') as PlanId
  const now = Date.now()
  const current = typeof shop.paidUntil === 'string' ? new Date(shop.paidUntil).getTime() : 0
  const from = Math.max(now, Number.isFinite(current) ? current : 0)
  const paidUntil = new Date(from + PLANS[plan].days * DAY).toISOString()
  const reviewedAt = new Date().toISOString()

  tx.update(shopRef, {
    status: 'active',
    plan,
    paidUntil,
    trial: false,
    telegramAddon: shop.telegramAddon === true || payment.telegramAddon === true,
    updatedAt: reviewedAt,
  })
  tx.update(paymentRef, {
    status: 'approved',
    reviewedAt,
    reviewedBy: reviewer,
    paidUntil,
  })
  return { shopId: String(payment.shopId), paidUntil }
}
