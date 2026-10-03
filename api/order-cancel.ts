import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb } from './_lib/firebase-admin.js'
import { fail, requirePost } from './_lib/http.js'
import { applyStatusEffects, type OrderDoc } from './_lib/actions/orders.js'
import { shopDoc, withShop } from './_lib/context.js'
import { customerRequest } from './_lib/customer.js'
import { runTx } from './_lib/firestore-tx.js'

/** Faqat shu statuslardagi buyurtmani mijoz bekor qila oladi. */
const CANCELLABLE = ['Yangi', 'Qabul qilindi']

/**
 * POST /api/order-cancel   { orderId }
 * Authorization: Bearer <Firebase ID token>
 *
 * Mijoz o'z buyurtmasini bekor qiladi (5-band).
 *
 * Ilgari "Bekor qilingan" statusiga o'tish yo'li umuman yo'q edi —
 * buyurtmalar sahifasida shu nomli bo'lim bor edi-yu, u abadiy bo'sh
 * turardi.
 *
 * Bekor qilinganda ombor qoldig'i qaytariladi.
 *
 * Keyin admin paneldagi bekor qilish bilan BIR XIL yo'l ishlaydi
 * (applyStatusEffects): kuryerlardagi «Ilovada ochish» xabari
 * «❌ Mijoz bekor qildi» ga aylanadi, kuryer ilovasi darhol yangilanadi
 * va tarixga yoziladi. Mijozning o'ziga xabar
 * yuborilmaydi — o'zi bekor qildi. Adminga xabarni bot beradi
 * (`cancelNotified` bayrog'i).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  const who = await customerRequest(req, res)
  if (!who) return
  const { uid } = who

  const orderId = String(req.body?.orderId ?? '').trim()
  if (!orderId) return fail(res, 400, 'Buyurtma tanlanmagan')

  return withShop(who.context, () => cancelOrder(res, uid, orderId))
}

async function cancelOrder(res: VercelResponse, uid: string, orderId: string) {
  const db = await adminDb()
  const tenant = await shopDoc()

  try {
    const now = new Date().toISOString()
    const result = await runTx(db, async (tx) => {
      const orderRef = tenant.collection('orders').doc(orderId)
      const orderSnap = await tx.get(orderRef)
      if (!orderSnap.exists) throw new Error('NOT_FOUND')

      const order = orderSnap.data() as FirebaseFirestore.DocumentData

      // Faqat o'z buyurtmasi
      if (order.uid !== uid) throw new Error('NOT_YOURS')

      const status = String(order.status || '')
      if (status === 'Bekor qilingan') throw new Error('ALREADY_CANCELLED')
      if (!CANCELLABLE.includes(status)) throw new Error('TOO_LATE')

      // Ombor qoldig'ini qaytaramiz
      const items = Array.isArray(order.products) ? order.products : []
      const restore = new Map<string, number>()
      items.forEach((item) => {
        const id = String(item?.product?.id ?? '')
        if (!id) return
        restore.set(id, (restore.get(id) || 0) + (Number(item.quantity) || 0))
      })

      const productRefs = [...restore.keys()].map((id) => tenant.collection('products').doc(id))
      const productSnaps = productRefs.length ? await tx.getAll(...productRefs) : []

      productSnaps.forEach((snap) => {
        if (!snap.exists) return
        const data = snap.data() as FirebaseFirestore.DocumentData
        if (typeof data.stock !== 'number') return
        const back = restore.get(snap.id) || 0
        tx.update(snap.ref, { stock: data.stock + back })
      })

      tx.update(orderRef, {
        status: 'Bekor qilingan',
        cancelledAt: now,
        cancelledBy: 'customer',
        statusUpdatedAt: now,
        // Qoldiq shu yerda qaytarildi — admin keyin «Rad etildi» qo'ysa
        // ikkinchi marta oshib ketmasligi uchun (api/_lib/stock.ts)
        stockRestored: true,
        stockRestoredAt: now,
        // Bot mijozga xabar berishi uchun bayroq
        cancelNotified: false,
      })

      return {
        id: orderId,
        orderNumber: String(order.orderNumber || order.id || ''),
        before: order as OrderDoc,
      }
    })

    // Xabarlar ketmasa ham bekor qilish kuchda — xato mijozga qaytmaydi
    try {
      await applyStatusEffects(
        orderId,
        result.before,
        'Bekor qilingan',
        { uid, name: 'Mijoz', role: 'customer' },
        now,
        { customerNotice: false, closeLabel: '❌ Mijoz bekor qildi' },
      )
    } catch (error) {
      console.error('[order-cancel] keyingi ishlar bajarilmadi:', error)
    }

    return res.status(200).json({ id: result.id, orderNumber: result.orderNumber })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const messages: Record<string, string> = {
      NOT_FOUND: 'Buyurtma topilmadi',
      NOT_YOURS: 'Bu buyurtma sizniki emas',
      ALREADY_CANCELLED: 'Buyurtma allaqachon bekor qilingan',
      TOO_LATE: "Bu buyurtmani endi bekor qilib bo'lmaydi — operator bilan bog'laning",
    }
    if (messages[code]) return fail(res, 400, messages[code], code)

    console.error('[order-cancel] xato:', error)
    return fail(res, 500, "Bekor qilinmadi, qayta urinib ko'ring")
  }
}
