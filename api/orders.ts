import type { VercelRequest, VercelResponse } from '@vercel/node'
import { LOW_STOCK_AT, bumpOrdersSignal, notifyLowStock, notifyNewOrder } from './_lib/actions/orders.js'
import { adminAuth, adminDb } from './_lib/firebase-admin.js'
import { fail, requirePost } from './_lib/http.js'
import { bestPromotion, promoPrice, readPromotion } from './_lib/promotions.js'
import { formatDailyNumber, tashkentDay } from './_lib/order-number.js'
import { loadShopContext, shopDoc, withShop } from './_lib/context.js'
import { isShopActive, readShopState, shopIdFrom } from './_lib/tenant.js'
import { runTx } from './_lib/firestore-tx.js'

type IncomingItem = {
  productId: number | string
  quantity: number
  size?: string
  color?: string
}

type IncomingOrder = {
  items: IncomingItem[]
  customer: {
    name: string
    phone: string
    address: string
    location: { lat: number; lng: number } | null
    comment: string
    paymentMethod: 'Naqd' | 'Karta'
    /** Yetkazib berish yoki do'kondan olib ketish. */
    fulfillment: 'delivery' | 'pickup'
    /** Buyurtmani boshqa odam oladigan bo'lsa. */
    recipientName?: string
    recipientPhone?: string
  }
  promoCode?: string
  /** Takroriy buyurtmani to'sish uchun mijoz yaratadigan noyob kalit. */
  clientOrderId?: string
}

/** Mijoz yuborgan ma'lumotni tozalaymiz — narx, jami va status bu yerdan kelmaydi. */
function readOrder(body: unknown): IncomingOrder {
  const b = body as Partial<IncomingOrder> | undefined
  const items = Array.isArray(b?.items) ? b.items : []
  if (items.length === 0) throw new Error("Savat bo'sh")
  if (items.length > 50) throw new Error("Savatda juda ko'p mahsulot")

  const customer = b?.customer
  if (!customer) throw new Error("Mijoz ma'lumoti yo'q")

  const name = String(customer.name || '').trim()
  const phone = String(customer.phone || '').trim()
  const address = String(customer.address || '').trim()
  const fulfillment = customer.fulfillment === 'pickup' ? 'pickup' : 'delivery'
  if (!name || !phone) throw new Error("Ism va telefon to'ldirilishi shart")
  // Olib ketishda manzil kerak emas — mijoz do'konga o'zi keladi
  if (fulfillment === 'delivery' && !address) throw new Error("Yetkazish manzilini kiriting")

  const paymentMethod = customer.paymentMethod === 'Karta' ? 'Karta' : 'Naqd'

  return {
    items: items.map((item) => {
      const quantity = Math.floor(Number(item.quantity))
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
        throw new Error("Mahsulot miqdori noto'g'ri")
      }
      return {
        productId: item.productId,
        quantity,
        size: item.size ? String(item.size).slice(0, 40) : undefined,
        color: item.color ? String(item.color).slice(0, 40) : undefined,
      }
    }),
    customer: {
      name: name.slice(0, 120),
      phone: phone.slice(0, 40),
      address: address.slice(0, 300),
      location:
        customer.location && typeof customer.location.lat === 'number'
          ? { lat: customer.location.lat, lng: customer.location.lng }
          : null,
      comment: String(customer.comment || '').slice(0, 500),
      paymentMethod,
      fulfillment,
      recipientName: String(customer.recipientName || '').trim().slice(0, 120),
      recipientPhone: String(customer.recipientPhone || '').trim().slice(0, 40),
    },
    promoCode: b?.promoCode ? String(b.promoCode).trim().toUpperCase().slice(0, 40) : undefined,
    clientOrderId: b?.clientOrderId ? String(b.clientOrderId).slice(0, 64) : undefined,
  }
}

/**
 * POST /api/orders
 * Authorization: Bearer <Firebase ID token>
 *
 * Buyurtmani SERVER yaratadi. Mijoz faqat qaysi mahsulotdan nechta
 * olishini aytadi — narx, chegirma va jami Firestore'dagi haqiqiy
 * qiymatlardan qayta hisoblanadi (F-04, F-18).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  // ── Kim so'rayapti ─────────────────────────────────────────
  const authHeader = String(req.headers.authorization || '')
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) return fail(res, 401, 'Avtorizatsiya talab qilinadi')

  let uid: string
  try {
    const decoded = await (await adminAuth()).verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return fail(res, 401, 'Sessiya eskirgan, ilovani qayta oching')
  }

  let order: IncomingOrder
  try {
    order = readOrder(req.body)
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : "Ma'lumot noto'g'ri")
  }

  // ── Qaysi do'kon ───────────────────────────────────────────
  const shopId = shopIdFrom(req.body, req.headers)
  const context = shopId ? await loadShopContext(shopId).catch(() => null) : null
  if (!context) return fail(res, 404, "Do'kon topilmadi", 'SHOP_NOT_FOUND')

  // To'lov qilinmagan (ko'rish rejimidagi) yoki muddati tugagan do'kon buyurtma olmaydi
  const state = await readShopState(await adminDb(), shopId)
  if (!isShopActive(state)) {
    return fail(res, 403, "Do'kon hozircha buyurtma qabul qilmayapti", 'SHOP_INACTIVE')
  }

  return withShop(context, () => createOrder(res, uid, order))
}

async function createOrder(res: VercelResponse, uid: string, order: IncomingOrder) {
  const db = await adminDb()
  const tenant = await shopDoc()

  try {
    const result = await runTx(db, async (tx) => {
      // ── 1. O'qishlar (transaction'da hamma o'qish yozishdan oldin) ──
      const productRefs = order.items.map((item) =>
        tenant.collection('products').doc(String(item.productId)),
      )
      const productSnaps = await tx.getAll(...productRefs)

      const createdAt = new Date()
      const orderDay = tashkentDay(createdAt)
      const counterRef = tenant.collection('counters').doc(`orders-${orderDay}`)
      const counterSnap = await tx.get(counterRef)

      const userRef = tenant.collection('users').doc(uid)
      const userSnap = await tx.get(userRef)
      /*
       * Mijoz kimligi — Firebase uid (brauzerda anonim hisob, Telegram'da
       * Telegram id). Telegram orqali kirganlarga bot xabar yuboradi,
       * shuning uchun raqamli id alohida saqlanadi.
       */
      const telegramId = Number(userSnap.data()?.telegramId) || (/^\d+$/.test(uid) ? Number(uid) : null)

      const deliveryRef = tenant.collection('settings').doc('delivery')
      const deliverySnap = await tx.get(deliveryRef)

      // Do'kon qaysi usullarni yoqqan — mijoz o'chirilganini tanlay olmasin
      const shopSnap = await tx.get(tenant)
      const shopData = shopSnap.data() ?? {}
      const deliveryOn = shopData.delivery?.enabled !== false
      const pickupOn = shopData.delivery?.pickup !== false
      if (order.customer.fulfillment === 'delivery' && !deliveryOn) throw new Error('DELIVERY_OFF')
      if (order.customer.fulfillment === 'pickup' && !pickupOn) throw new Error('PICKUP_OFF')
      if (order.customer.paymentMethod === 'Karta' && shopData.payments?.card !== true) throw new Error('CARD_OFF')
      if (order.customer.paymentMethod === 'Naqd' && shopData.payments?.cash === false) throw new Error('CASH_OFF')

      // Vaqtli aksiyalar — narx faqat shu yerda, Firestore'dagi holatdan
      const promoSnap = await tx.get(tenant.collection('promotions').where('active', '==', true))
      const promotions = promoSnap.docs.map((doc) => readPromotion(doc.id, doc.data()))
      const now = Date.now()

      // Takroriylikni to'sish: xuddi shu kalit bilan buyurtma allaqachon
      // yaratilgan bo'lsa, yangisini yaratmay o'shani qaytaramiz. Sekin
      // internetda javob yo'qolib, mijoz qayta bosganda ham bitta buyurtma
      // qoladi.
      if (order.clientOrderId) {
        const existing = await tx.get(
          tenant.collection('orders').where('clientOrderId', '==', order.clientOrderId).limit(1),
        )
        if (!existing.empty) {
          const doc = existing.docs[0]
          const data = doc.data()
          return {
            id: doc.id,
            orderNumber: String(data.orderNumber || ''),
            total: Number(data.total) || 0,
            discount: Number(data.discount) || 0,
            deliveryFee: Number(data.deliveryFee) || 0,
            duplicate: true,
          }
        }
      }

      let promoRef: FirebaseFirestore.DocumentReference | null = null
      let promoData: FirebaseFirestore.DocumentData | null = null
      if (order.promoCode) {
        const promoQuery = await tx.get(
          tenant.collection('promocodes').where('code', '==', order.promoCode).limit(1),
        )
        if (promoQuery.empty) throw new Error('PROMO_NOT_FOUND')
        promoRef = promoQuery.docs[0].ref
        promoData = promoQuery.docs[0].data()
      }

      // ── 2. Narx va ombor qoldig'ini tekshirish ─────────────
      // Bir mahsulot savatda bir necha variant (o'lcham/rang) bilan
      // turishi mumkin — qoldiqni umumiy miqdor bo'yicha tekshiramiz.
      const requestedByProduct = new Map<string, number>()
      order.items.forEach((item) => {
        const key = String(item.productId)
        requestedByProduct.set(key, (requestedByProduct.get(key) || 0) + item.quantity)
      })

      const stockUpdates: { ref: FirebaseFirestore.DocumentReference; stock: number }[] = []
      // Qoldig'i tugab qolganlar — tranzaksiyadan keyin adminlarga aytiladi
      const lowStock: { id: string; name: string; stock: number }[] = []
      const seenProducts = new Set<string>()

      const products = order.items.map((item, i) => {
        const snap = productSnaps[i]
        if (!snap.exists) throw new Error('PRODUCT_GONE')
        const data = snap.data() as FirebaseFirestore.DocumentData

        const basePrice = Number(data.price)
        if (!Number.isFinite(basePrice) || basePrice <= 0) throw new Error('PRODUCT_PRICE')

        const promo = bestPromotion(
          promotions,
          { id: snap.id, category: String(data.category || ''), sectionId: data.sectionId ? String(data.sectionId) : null },
          now,
        )
        const price = promo ? promoPrice(basePrice, promo.percent) : basePrice

        const key = String(item.productId)
        if (!seenProducts.has(key) && typeof data.stock === 'number') {
          seenProducts.add(key)
          const requested = requestedByProduct.get(key) || 0
          if (data.stock < requested) {
            throw new Error(data.stock <= 0 ? 'OUT_OF_STOCK' : 'NOT_ENOUGH_STOCK')
          }
          const left = data.stock - requested
          stockUpdates.push({ ref: snap.ref, stock: left })
          if (left <= LOW_STOCK_AT) {
            lowStock.push({ id: snap.id, name: String(data.name || ''), stock: left })
          }
        }

        return {
          product: {
            id: Number(data.id ?? snap.id),
            name: String(data.name || ''),
            price,
            // Aksiya bo'lsa — asl narx va qaysi aksiya, hisobot va chek uchun
            ...(promo ? { originalPrice: basePrice, promotion: { id: promo.id, title: promo.title, percent: promo.percent } } : {}),
            images: Array.isArray(data.images) ? data.images : [],
            // Buyurtmalar ro'yxatida kichik nusxa ko'rsatiladi
            thumbs: Array.isArray(data.thumbs) ? data.thumbs : [],
            variantSources: Array.isArray(data.variantSources) ? data.variantSources : [],
            category: String(data.category || ''),
            // Set — tarkibi nomlari bilan (chek, kuryer va admin nimani yig'ishni ko'rsin)
            ...(Array.isArray(data.bundle) && data.bundle.length
              ? {
                  bundle: (data.bundle as { name?: unknown; quantity?: unknown }[]).map((b) => ({
                    name: String(b?.name || ''),
                    quantity: Number(b?.quantity) || 1,
                  })),
                }
              : {}),
          },
          quantity: item.quantity,
          size: item.size ?? null,
          color: item.color ?? null,
        }
      })

      const subtotal = products.reduce((sum, p) => sum + p.product.price * p.quantity, 0)

      // ── 3. Promokod ────────────────────────────────────────
      let discountPercent = 0
      let appliedPromo: string | null = null

      if (promoData && promoRef) {
        if (promoData.active === false) throw new Error('PROMO_INACTIVE')

        const expiresAt = promoData.expiresAt ? Date.parse(String(promoData.expiresAt)) : NaN
        if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) throw new Error('PROMO_EXPIRED')

        const maxUses = Number(promoData.maxUses)
        const usageCount = Number(promoData.usageCount) || 0
        if (Number.isFinite(maxUses) && maxUses > 0 && usageCount >= maxUses) {
          throw new Error('PROMO_USED_UP')
        }

        const usedBy: unknown[] = Array.isArray(promoData.usedBy) ? promoData.usedBy : []
        if (usedBy.includes(uid) || (telegramId !== null && usedBy.includes(telegramId))) throw new Error('PROMO_ALREADY_USED')

        const minOrderTotal = Number(promoData.minOrderTotal) || 0
        if (subtotal < minOrderTotal) throw new Error('PROMO_MIN_TOTAL')

        discountPercent = Math.min(Math.max(Number(promoData.discountPercent) || 0, 0), 100)
        appliedPromo = String(promoData.code || order.promoCode)
      }

      const discount = Math.round((subtotal * discountPercent) / 100)
      const discountedSubtotal = Math.max(subtotal - discount, 0)

      // ── 4. Yetkazib berish narxi ───────────────────────────
      const delivery = deliverySnap.exists ? deliverySnap.data() : null

      /*
       * Minimal buyurtma summasi. Sozlanmagan yoki 0 bo'lsa — cheklov
       * umuman yo'q, ilova avvalgidek ishlayveradi. Tekshiruv promokod
       * chegirmasidan OLDINGI summa bo'yicha: chegirma do'kon bergan
       * imtiyoz, u minimalni buzmasligi kerak.
       */
      const minOrder = Math.max(Number(delivery?.minOrder) || 0, 0)
      if (minOrder > 0 && subtotal < minOrder) {
        throw new Error(`MIN_ORDER:${minOrder}`)
      }

      const deliveryFee = Math.max(Number(delivery?.fee) || 0, 0)
      const freeFrom = Math.max(Number(delivery?.freeFrom) || 0, 0)
      const appliedDelivery = order.customer.fulfillment === 'pickup' || (freeFrom > 0 && discountedSubtotal >= freeFrom)
        ? 0
        : deliveryFee

      const total = discountedSubtotal + appliedDelivery

      // ── 5. Yozishlar ───────────────────────────────────────
      const dailyNumber = (counterSnap.exists ? Number(counterSnap.data()?.value) || 0 : 0) + 1
      const orderNumber = formatDailyNumber(dailyNumber)
      tx.set(counterRef, { value: dailyNumber, day: orderDay }, { merge: true })

      if (promoRef) {
        const usedBy = Array.isArray(promoData?.usedBy) ? promoData.usedBy : []
        tx.update(promoRef, {
          usageCount: (Number(promoData?.usageCount) || 0) + 1,
          usedBy: [...usedBy, uid],
        })
      }

      // Ombor qoldig'ini kamaytiramiz — buyurtma bilan bir transactionda
      stockUpdates.forEach(({ ref, stock }) => tx.update(ref, { stock }))

      const userData = userSnap.data() || {}
      const orderRef = tenant.collection('orders').doc()

      tx.set(orderRef, {
        orderNumber,
        orderDay,
        dailyNumber,
        createdAt: createdAt.toISOString(),
        products,
        subtotal,
        discount,
        discountPercent,
        promoCode: appliedPromo,
        deliveryFee: appliedDelivery,
        total,
        status: 'Yangi',
        paymentMethod: order.customer.paymentMethod,
        paymentStatus: order.customer.paymentMethod === 'Karta' ? 'Kutilmoqda' : null,
        customer: { ...order.customer, promoCode: appliedPromo },
        clientOrderId: order.clientOrderId ?? null,
        uid,
        // Telegram orqali kirgan mijoz — bot xabarlari shu id ga boradi
        userId: telegramId,
        username: userData.username ?? null,
        notified: false,
      })

      // Mijozlar bazasi: brauzer mijozi /api/auth dan o'tmaydi, profil shu yerda
      tx.set(userRef, {
        uid,
        name: order.customer.name,
        phone: order.customer.phone,
        ...(telegramId ? { telegramId } : {}),
        ordersCount: (Number(userData.ordersCount) || 0) + 1,
        lastOrderAt: createdAt.toISOString(),
        ...(userSnap.exists ? {} : { createdAt: createdAt.toISOString() }),
      }, { merge: true })

      return {
        id: orderRef.id,
        orderNumber,
        total,
        discount,
        deliveryFee: appliedDelivery,
        duplicate: false,
        lowStock,
      }
    })

    // Xodimlarga xabar — javobni kutmasdan emas, ATAYLAB kutib.
    // Serverless funksiya javob qaytargach to'xtaydi va "orqa fonda"
    // boshlangan ish bajarilmay qolishi mumkin.
    if (!result.duplicate) {
      const snap = await tenant.collection('orders').doc(result.id).get()
      await notifyNewOrder(result.id, snap.data() || {})
      // Kuryer ilovalari (smenadagilar) ro'yxatni yangilaydi
      await bumpOrdersSignal()
      // Ombor signali — buyurtma xabarnomasidan keyin, alohida xabar
      await notifyLowStock(result.lowStock ?? [])
    }

    // `lowStock` faqat ichki ish uchun — mijozga qaytarilmaydi
    return res.status(200).json({
      id: result.id,
      orderNumber: result.orderNumber,
      total: result.total,
      discount: result.discount,
      deliveryFee: result.deliveryFee,
      duplicate: result.duplicate,
    })
  } catch (error) {
    const raw = error instanceof Error ? error.message : ''

    // MIN_ORDER:150000 — summa xabarga ham, ilovaga ham kerak
    if (raw.startsWith('MIN_ORDER:')) {
      const amount = Number(raw.split(':')[1]) || 0
      return fail(
        res,
        400,
        `Minimal buyurtma summasi ${amount.toLocaleString('uz-UZ')} so'm`,
        'MIN_ORDER',
        { amount },
      )
    }

    const code = raw
    const messages: Record<string, string> = {
      PRODUCT_GONE: 'Savatdagi mahsulotlardan biri endi mavjud emas',
      PRODUCT_PRICE: "Mahsulot narxi noto'g'ri, adminga murojaat qiling",
      PROMO_NOT_FOUND: 'Bunday promokod topilmadi',
      PROMO_INACTIVE: 'Promokod faol emas',
      PROMO_EXPIRED: 'Promokod muddati tugagan',
      PROMO_USED_UP: 'Promokoddan foydalanish chegarasi tugagan',
      PROMO_ALREADY_USED: 'Siz bu promokoddan allaqachon foydalangansiz',
      PROMO_MIN_TOTAL: 'Bu promokod uchun buyurtma summasi yetarli emas',
      OUT_OF_STOCK: 'Savatdagi mahsulotlardan biri sotuvda qolmadi',
      NOT_ENOUGH_STOCK: 'Omborda yetarli miqdor yo‘q, savatdagi sonni kamaytiring',
      DELIVERY_OFF: "Bu do'kon hozir yetkazib bermaydi — olib ketishni tanlang",
      PICKUP_OFF: "Bu do'kondan olib ketib bo'lmaydi — yetkazishni tanlang",
      CARD_OFF: "Karta orqali to'lov yoqilmagan",
      CASH_OFF: "Naqd to'lov yoqilmagan",
    }
    if (messages[code]) return fail(res, 400, messages[code], code)

    console.error('[orders] xato:', error)
    return fail(res, 500, "Buyurtma yaratilmadi, qayta urinib ko'ring")
  }
}
