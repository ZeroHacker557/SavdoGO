import { getApps, initializeApp } from 'firebase/app'
import {
  getFirestore, collection, onSnapshot, query, where, doc, writeBatch, getDocs, getDoc, setDoc,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase'
import { parseDate } from '../utils/date'
import { readPromotion, type Promotion } from '../utils/promotions'
import { readSplashAd, type SplashAd } from '../utils/splash-ad'
import { activeShop, activeShopId, isPreview } from '../shop/active'
import { demoCategories, demoProducts } from '../shop/demo-catalog'
import type {
  Product, Category, Section, Order, PaymentSettings, DeliverySettings, Notification, UserProfile, Review,
} from '../types/domain'

/*
 * Firebase bitta — SavdoGO platformasi. Har do'kon ma'lumoti
 * `shops/{shopId}/...` ichida; qaysi do'kon ekanini src/shop/active.ts
 * biladi (sayt manzilidan aniqlangan).
 */
// Konfiguratsiya hali bo'sh bo'lsa ham oldindan ko'rish ishlasin: Firestore
// obyekti yaratiladi (bo'sh projectId bilan getFirestore xato tashlaydi),
// lekin preview rejimida unga umuman murojaat qilinmaydi.
const options = isFirebaseConfigured()
  ? firebaseConfig
  : { ...firebaseConfig, apiKey: 'unconfigured', projectId: 'savdogo-unconfigured', appId: 'unconfigured' }
export const app = getApps()[0] ?? initializeApp(options)
export const db = getFirestore(app)
export const storage = getStorage(app)

/** Joriy do'kon ichidagi kolleksiya. */
function scol(name: string) {
  return collection(db, 'shops', activeShopId(), name)
}

function sdoc(name: string, id: string) {
  return doc(db, 'shops', activeShopId(), name, id)
}

/**
 * Oldindan ko'rish rejimida bazaga murojaat yo'q: javob keyingi
 * «tick»da beriladi (onSnapshot kabi asinxron), obunani bekor qilish
 * esa hech narsa qilmaydi.
 */
function staticSnapshot<T>(value: T, callback: (value: T) => void): () => void {
  const timer = setTimeout(() => callback(value), 0)
  return () => clearTimeout(timer)
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

// ── Katalog (ochiq) ──────────────────────────────────────────

export function subscribeToProducts(callback: (products: Product[]) => void, onError?: (err: unknown) => void) {
  if (isPreview()) return staticSnapshot(demoProducts(activeShop().type), callback)

  return onSnapshot(scol('products'), (snapshot) => {
    // Nomsiz yozuv — mahsulot emas, katalogda chiqmasin
    const products: Product[] = snapshot.docs
      .filter((d) => typeof d.data().name === 'string' && d.data().name.trim() !== '')
      .map((d) => {
        const data = d.data()
        const rawId = data.id || d.id
        const numId = typeof rawId === 'number' ? rawId : (parseInt(String(rawId), 10) || Math.abs(hashString(d.id)))

        return {
          id: numId,
          name: data.name || '',
          price: Number(data.price) || 0,
          oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
          category: data.category || '',
          images: data.images || [],
          rating: data.rating || 5,
          reviews: data.reviews || 0,
          sizes: data.sizes || [],
          // Set tarkibi — bo'sh bo'lsa oddiy mahsulot
          bundle: Array.isArray(data.bundle) && data.bundle.length
            ? data.bundle
                .map((b: { productId?: unknown; quantity?: unknown; name?: unknown }) => ({
                  productId: String(b?.productId ?? ''),
                  quantity: Math.max(1, Number(b?.quantity) || 1),
                  name: String(b?.name || ''),
                }))
                .filter((b: { productId: string }) => b.productId)
            : undefined,
          color: data.color || '',
          description: data.description || '',
          nameRu: data.nameRu || '',
          nameEn: data.nameEn || '',
          descriptionRu: data.descriptionRu || '',
          descriptionEn: data.descriptionEn || '',
          discount: data.discount || '',
          stock: typeof data.stock === 'number' ? data.stock : undefined,
          thumbs: Array.isArray(data.thumbs) ? data.thumbs : undefined,
          optimized: Array.isArray(data.optimized) ? data.optimized : undefined,
          variantSources: Array.isArray(data.variantSources) ? data.variantSources : undefined,
          order: typeof data.order === 'number' ? data.order : undefined,
          sectionId: data.sectionId ? String(data.sectionId) : null,
          popular: data.popular === true,
        }
      })
    callback(products)
  }, (error) => {
    console.error('[Firebase] mahsulotlarni o‘qib bo‘lmadi:', error)
    onError?.(error)
  })
}

export function subscribeToCategories(callback: (categories: Category[]) => void, onError?: (err: unknown) => void) {
  if (isPreview()) return staticSnapshot(demoCategories(activeShop().type), callback)

  return onSnapshot(scol('categories'), (snapshot) => {
    const categories: Category[] = snapshot.docs.map((d) => {
      const data = d.data()
      const rawId = data.id || d.id
      const numId = typeof rawId === 'number' ? rawId : (parseInt(String(rawId), 10) || Math.abs(hashString(d.id)))
      return {
        id: numId,
        name: data.name || '',
        nameRu: data.nameRu || '',
        icon: data.icon || 'package',
        order: typeof data.order === 'number' ? data.order : undefined,
      }
    })
    // Admin tartibi bo'yicha; belgilanmaganlar oxirida, o'z tartibida
    categories.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9))
    callback(categories)
  }, (error) => {
    console.error('[Firebase] kategoriyalarni o‘qib bo‘lmadi:', error)
    onError?.(error)
  })
}

// Buyurtmani mijoz emas, SERVER yaratadi: POST /api/orders.
// Narx, chegirma va jami Firestore'dagi haqiqiy qiymatlardan
// qayta hisoblanadi, shuning uchun bu yerda addDoc yo'q (F-04).

// ── Yetkazish va to'lov — do'kon hujjatidan ─────────────────

/**
 * Yetkazish narxi do'konning ommaviy hujjatida — sayt ochilganda
 * allaqachon o'qilgan, qo'shimcha so'rov kerak emas. Admin
 * sozlamani o'zgartirsa, do'kon hujjati jonli yangilanadi
 * (src/shop/context.tsx).
 */
export async function getDeliverySettings(): Promise<DeliverySettings> {
  const { fee, freeFrom, minOrder } = activeShop().delivery
  return { fee, freeFrom, minOrder }
}

/** Karta ma'lumoti yagona manbadan — do'kon hujjatidan (F-07). */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { cardNumber, cardOwner } = activeShop().payments
  return { cardNumber, cardOwner }
}

// ── Mijoz profili ────────────────────────────────────────────

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  if (isPreview()) return staticSnapshot(null, callback)
  return onSnapshot(sdoc('users', uid), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as UserProfile) : null)
  }, (error) => {
    console.error('[Firebase] profil o‘qilmadi:', error)
    callback(null)
  })
}

/**
 * Profil maydonlarini yangilaydi (yo'q bo'lsa — yaratadi).
 *
 * Brauzer mijozi profilini o'zi yaratadi (manzillar, til, savat) —
 * Rules faqat shu maydonlarga ruxsat beradi.
 *
 * XATONI YUTMAYDI — ataylab: chaqiruvchi foydalanuvchiga aniq xabar
 * berishi uchun (aks holda «saqlandi» deyilib, bazaga hech narsa
 * tushmay qolardi).
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  if (isPreview()) return
  await setDoc(sdoc('users', uid), data, { merge: true })
}

/**
 * Ochilish reklamasi (`ads/splash`). Jonli kuzatilmaydi — sayt
 * ochilganda bir marta o'qiladi. O'qib bo'lmasa `null`.
 */
export async function fetchSplashAd(): Promise<SplashAd | null> {
  if (isPreview()) return null
  try {
    const snapshot = await getDoc(sdoc('ads', 'splash'))
    return snapshot.exists() ? readSplashAd(snapshot.data()) : null
  } catch (error) {
    console.warn('[Firebase] reklamani o‘qib bo‘lmadi:', error)
    return null
  }
}

/** Vaqtli aksiyalar — narx qoidasi src/utils/promotions.ts da. */
export function subscribeToPromotions(callback: (promotions: Promotion[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  return onSnapshot(
    query(scol('promotions'), where('active', '==', true)),
    (snapshot) => callback(snapshot.docs.map((d) => readPromotion(d.id, d.data()))),
    (error) => {
      // Aksiyalar o'qilmasa katalog oddiy narxlar bilan ishlayveradi
      console.error('[Firebase] aksiyalar o‘qilmadi:', error)
      callback([])
    },
  )
}

/** Bo'limlar — kategoriya ichidagi guruhlar (Section). */
export function subscribeToSections(callback: (sections: Section[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  return onSnapshot(
    scol('sections'),
    (snapshot) => {
      const sections = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: String(data.name || ''),
          nameRu: String(data.nameRu || ''),
          category: String(data.category || ''),
          order: typeof data.order === 'number' ? data.order : undefined,
        }
      })
      callback(sections)
    },
    (error) => {
      // Bo'limlar bo'lmasa ham katalog oddiy ro'yxat bo'lib ishlaydi
      console.error('[Firebase] bo‘limlar o‘qilmadi:', error)
      callback([])
    },
  )
}

// ── Buyurtmalar ──────────────────────────────────────────────

export function subscribeToUserOrders(uid: string, callback: (orders: Order[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  // Faqat `where` — kompozit indeks talab qilmasin; saralash mijoz tomonida
  const q = query(scol('orders'), where('uid', '==', uid))

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((snap) => {
      const data = snap.data()
      return {
        ...data,
        // Haqiqiy kalit — hujjat identifikatori (F-03)
        id: snap.id,
        orderNumber: data.orderNumber || snap.id,
        createdAt: data.createdAt || '',
      } as Order
    })
    orders.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt))
    callback(orders)
  }, (error) => {
    console.error('[Firebase] buyurtmalar o‘qilmadi:', error)
    // Xato bo'lsa ham javob beramiz: aks holda sahifa skeletda qotib qolardi
    callback([])
  })
}

// ── Sharhlar ─────────────────────────────────────────────────
// Sharhni /api/reviews yaratadi — mijoz to'g'ridan-to'g'ri yoza olmaydi.

export function subscribeToProductReviews(productId: number, callback: (reviews: Review[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  const q = query(scol('reviews'), where('productId', '==', productId))
  return onSnapshot(q, (snapshot) => {
    const reviews: Review[] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Review))
    reviews.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    callback(reviews)
  }, (error) => {
    console.error('[Firebase] sharhlar o‘qilmadi:', error)
  })
}

export function subscribeToUserReviews(uid: string, callback: (reviews: Review[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  const q = query(scol('reviews'), where('uid', '==', uid))
  return onSnapshot(q, (snapshot) => {
    const reviews: Review[] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Review))
    reviews.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    callback(reviews)
  }, (error) => {
    console.error('[Firebase] mening sharhlarim o‘qilmadi:', error)
  })
}

// ── Bildirishnomalar ─────────────────────────────────────────

export function subscribeToUserNotifications(uid: string, callback: (notifications: Notification[]) => void) {
  if (isPreview()) return staticSnapshot([], callback)
  const q = query(scol('notifications'), where('uid', '==', uid))
  return onSnapshot(q, (snapshot) => {
    const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notification))
    // ISO sana bo'yicha saralash; eski formatlar oxiriga tushadi (F-10)
    notifs.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    callback(notifs)
  }, (error) => {
    console.error('[Firebase] bildirishnomalar o‘qilmadi:', error)
  })
}

async function markRead(uid: string, onlyOrders: boolean) {
  if (isPreview()) return
  try {
    const snapshot = await getDocs(query(scol('notifications'), where('uid', '==', uid), where('read', '==', false)))
    const targets = onlyOrders ? snapshot.docs.filter((d) => d.data().type === 'order') : snapshot.docs
    if (!targets.length) return
    const batch = writeBatch(db)
    targets.forEach((docSnap) => batch.update(docSnap.ref, { read: true }))
    await batch.commit()
  } catch (error) {
    console.error('[Firebase] bildirishnomalar belgilanmadi:', error)
  }
}

/**
 * Faqat BUYURTMA bildirishnomalarini o'qilgan qiladi — mijoz «Buyurtmalar»
 * bo'limini ochganda. Aksiya va tizim xabarlari qo'ng'iroqchada qoladi.
 */
export function markOrderNotificationsAsRead(uid: string) {
  return markRead(uid, true)
}

export function markNotificationsAsRead(uid: string) {
  return markRead(uid, false)
}
