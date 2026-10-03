import { adminDb } from '../firebase-admin.js'
import { escapeHtml, sendMessage } from '../telegram.js'
import { adminTargets } from './orders.js'
import { shopDoc } from '../context.js'
import { customerName } from '../customer.js'
import { runTx } from '../firestore-tx.js'

/**
 * Mijoz kuryerni baholaydi (mini app'dagi 5 yulduzli oyna).
 *
 * POST /api/reviews { kind: "courier", orderId, stars, tags?, comment?, productStars? }
 *
 * Shu oynada mahsulotlar ham baholanadi (`productStars`) — ilgari mijozga
 * bot ham, ilova ham alohida baho so'rardi. Endi kuryerli buyurtmada
 * bitta oyna: bot faqat uni ochadigan tugma yuboradi (orders.ts →
 * sendRatingPrompt).
 *
 * Shartlar: buyurtma shu mijozniki, «Yetkazildi», kuryeri bor va hali
 * baholanmagan. Baho buyurtmaga yoziladi, kuryerning `staff` hujjatida
 * esa yig'indi va soni oshadi — profildagi «★ 4.8 (23)» shundan.
 * Past baho (1–2) adminlarga darhol xabar qilinadi.
 */

const TAGS = new Set([
  'fast', 'polite', 'careful',       // yaxshi
  'late', 'rude', 'damaged',         // yomon
])
const TAG_UZ: Record<string, string> = {
  fast: 'Tez yetkazdi', polite: 'Xushmuomala', careful: 'Ehtiyotkor',
  late: 'Kechikdi', rude: 'Qo‘pol', damaged: 'Mahsulot shikastlangan',
}

export class RatingError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function rateCourier(uid: string, body: Record<string, unknown>) {
  const orderId = String(body.orderId || '').trim()
  const stars = Math.floor(Number(body.stars))
  if (!orderId) throw new RatingError('ORDER_MISSING', 'Buyurtma tanlanmagan')
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new RatingError('RATING_RANGE', 'Baho 1 dan 5 gacha bo‘lishi kerak')
  }
  const tags = Array.isArray(body.tags) ? [...new Set(body.tags.map(String))].filter((t) => TAGS.has(t)) : []
  const productStars = Math.floor(Number(body.productStars))
  const rateProducts = Number.isFinite(productStars) && productStars >= 1 && productStars <= 5
  const comment = String(body.comment ?? '').trim().slice(0, 500)

  const db = await adminDb()
  const tenant = await shopDoc()
  const orderRef = tenant.collection('orders').doc(orderId)
  const now = new Date().toISOString()

  const result = await runTx(db, async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) throw new RatingError('ORDER_GONE', 'Buyurtma topilmadi')
    const order = snap.data() as {
      uid?: string; status?: string; courierId?: string | null; courierName?: string
      orderNumber?: string; courierRating?: unknown
    }
    if (order.uid !== uid) throw new RatingError('NOT_YOURS', 'Bu buyurtma sizniki emas')
    if (order.status !== 'Yetkazildi') throw new RatingError('NOT_DELIVERED', 'Buyurtma hali yetkazilmagan')
    if (!order.courierId) throw new RatingError('NO_COURIER', 'Bu buyurtmani kuryer yetkazmagan')
    if (order.courierRating) throw new RatingError('ALREADY_RATED', 'Siz bu buyurtmani allaqachon baholagansiz')

    const staffRef = tenant.collection('staff').doc(order.courierId)
    const staffSnap = await tx.get(staffRef)
    const staff = (staffSnap.data() || {}) as { ratingSum?: number; ratingCount?: number }

    tx.update(orderRef, { courierRating: { stars, tags, comment, at: now } })
    if (staffSnap.exists) {
      tx.update(staffRef, {
        ratingSum: (Number(staff.ratingSum) || 0) + stars,
        ratingCount: (Number(staff.ratingCount) || 0) + 1,
      })
    }
    return { courierName: order.courierName || 'Kuryer', orderNumber: order.orderNumber || `#${orderId.slice(0, 6)}` }
  })

  // Past baho — admin darhol bilsin
  if (stars <= 2) {
    try {
      const text =
        `⭐ <b>Past baho: ${stars}/5</b> — ${escapeHtml(result.courierName)}\n` +
        `📦 ${escapeHtml(result.orderNumber)}` +
        (tags.length ? `\n🏷 ${tags.map((t) => TAG_UZ[t]).join(', ')}` : '') +
        (comment ? `\n💬 ${escapeHtml(comment)}` : '')
      for (const target of await adminTargets()) await sendMessage(target, text)
    } catch (error) {
      console.error('[rating] adminlarga xabar ketmadi:', error)
    }
  }

  let products = 0
  if (rateProducts) {
    try {
      products = await rateOrderProducts(uid, orderId, productStars)
    } catch (error) {
      // Kuryer bahosi saqlandi — mahsulot bahosi yiqilsa ham mijozga xato ko'rsatilmaydi
      console.error('[rating] mahsulot bahosi saqlanmadi:', error)
    }
  }

  return { ok: true, stars, products }
}

/**
 * BITTA baho — buyurtmadagi hamma mahsulotga (botdagi ⭐ tugmalari ham — api/telegram.ts →
 * save_bot_review_all bilan bir xil qoida): mijoz shu mahsulotga avval
 * baho bergan bo'lsa bahosi yangilanadi, bo'lmasa yangi sharh; mahsulot
 * reytingi qayta hisoblanadi. Buyurtma egasi va «Yetkazildi» holati
 * rateCourier'da tekshirilgan.
 */
export async function rateOrderProducts(uid: string, orderId: string, stars: number): Promise<number> {
  const db = await adminDb()
  const tenant = await shopDoc()
  const order = (await tenant.collection('orders').doc(orderId).get()).data() as
    | { products?: { product?: { id?: unknown } }[] }
    | undefined
  const ids = [...new Set((order?.products || []).map((line) => String(line?.product?.id ?? '')).filter(Boolean))]

  const userName = customerName((await tenant.collection('users').doc(uid).get()).data() ?? {})

  let saved = 0
  for (const id of ids) {
    const productId = Number(id)
    if (!Number.isFinite(productId)) continue
    await runTx(db, async (tx) => {
      const productRef = tenant.collection('products').doc(id)
      const productSnap = await tx.get(productRef)
      const existing = await tx.get(tenant.collection('reviews').where('productId', '==', productId))
      const now = new Date().toISOString()

      const ratings: number[] = []
      let mine: FirebaseFirestore.DocumentReference | null = null
      for (const doc of existing.docs) {
        const data = doc.data() as { uid?: string; rating?: number }
        if (data.uid === uid) {
          mine = doc.ref
          ratings.push(stars)
        } else if (Number.isFinite(Number(data.rating))) {
          ratings.push(Number(data.rating))
        }
      }

      if (mine) tx.update(mine, { rating: stars, date: now, source: 'app-order' })
      else {
        ratings.push(stars)
        tx.set(tenant.collection('reviews').doc(), {
          productId, uid, userName, rating: stars, comment: '', date: now, source: 'app-order', orderId,
        })
      }
      if (productSnap.exists && ratings.length) {
        const average = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        tx.update(productRef, { rating: average, reviews: ratings.length })
      }
    })
    saved++
  }
  return saved
}
