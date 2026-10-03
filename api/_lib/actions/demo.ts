import { adminDb } from '../firebase-admin.js'
import { shopDoc } from '../context.js'

/**
 * Namuna katalogni tozalash.
 *
 * Do'kon yaratilganda biznes turiga mos namuna mahsulot va kategoriyalar
 * yoziladi (`demo: true` belgisi bilan — api/_lib/platform/seed.ts).
 * To'lovdan keyin ega o'z mahsulotlarini qo'shadi va namunalarni bir
 * bosishda o'chiradi. Ega namunani tahrirlagan bo'lsa ham belgi qoladi,
 * shuning uchun `keepEdited` bilan faqat tegilmaganlari o'chiriladi.
 */
export async function demoCleanup(body: Record<string, unknown>) {
  const db = await adminDb()
  const tenant = await shopDoc()
  const keepEdited = body.keepEdited === true

  const [products, categories] = await Promise.all([
    tenant.collection('products').where('demo', '==', true).get(),
    tenant.collection('categories').where('demo', '==', true).get(),
  ])

  const removeProducts = products.docs.filter((doc) => {
    if (!keepEdited) return true
    const data = doc.data()
    return !data.updatedAt || data.updatedAt === data.createdAt
  })

  // Hali mahsulot turgan kategoriya o'chirilmaydi (ega o'z mahsulotini qo'shgan bo'lishi mumkin)
  const removed = new Set(removeProducts.map((doc) => doc.id))
  const remaining = await tenant.collection('products').get()
  const usedCategories = new Set(
    remaining.docs.filter((doc) => !removed.has(doc.id)).map((doc) => String(doc.data().category || '')),
  )
  const removeCategories = categories.docs.filter((doc) => !usedCategories.has(String(doc.data().name || '')))

  const refs = [...removeProducts, ...removeCategories].map((doc) => doc.ref)
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch()
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }

  return { products: removeProducts.length, categories: removeCategories.length }
}
