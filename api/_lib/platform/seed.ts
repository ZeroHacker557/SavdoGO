import type { Firestore } from 'firebase-admin/firestore'
import { businessType, type BusinessTypeId } from '../../../src/platform/business-types.js'
import { shopScope } from '../tenant.js'

/**
 * Yangi do'konga namuna katalog yozadi.
 *
 * To'lovgacha do'kon bo'sh ko'rinmasin: biznes turiga mos kategoriyalar
 * va 6–12 ta mahsulot (rasm, narx, o'lcham, rang bilan). Hujjatlar
 * admin paneldagi «Mahsulot qo'shish» yozadigan shaklda — to'lovdan
 * keyin ega ularni oddiy mahsulot kabi tahrirlaydi yoki o'chiradi.
 * `demo: true` belgisi «Namunalarni o'chirish» tugmasi uchun.
 */
function newId(taken: Set<string>): string {
  let id: string
  do id = String(Math.floor(Math.random() * 900000) + 100000)
  while (taken.has(id))
  taken.add(id)
  return id
}

/** Unsplash manzilidagi kenglikni almashtiradi (katalog kartochkasi / sahifa). */
function sized(url: string, width: number): string {
  return url.replace(/([?&])w=\d+/, `$1w=${width}`)
}

export async function seedCatalog(db: Firestore, shopId: string, typeId: BusinessTypeId) {
  const type = businessType(typeId)
  const shop = shopScope(db, shopId)
  const now = new Date().toISOString()
  const ids = new Set<string>()
  const batch = db.batch()

  type.categories.forEach((category, index) => {
    const id = newId(ids)
    batch.set(shop.col('categories').doc(id), {
      id,
      name: category.name,
      nameRu: category.nameRu,
      icon: category.icon,
      order: index,
      demo: true,
    })
  })

  type.products.forEach((product, index) => {
    const id = newId(ids)
    const image = sized(product.image, 1200)
    batch.set(shop.col('products').doc(id), {
      id,
      name: product.name,
      nameRu: product.nameRu,
      nameEn: '',
      price: product.price,
      oldPrice: product.oldPrice && product.oldPrice > product.price ? product.oldPrice : null,
      category: product.category,
      sectionId: null,
      images: [image],
      thumbs: [sized(product.image, 480)],
      optimized: [image],
      variantSources: [image],
      sizes: product.sizes ?? [],
      color: (product.colors ?? []).join(', '),
      description: product.description,
      descriptionRu: product.descriptionRu ?? '',
      descriptionEn: '',
      discount: '',
      popular: product.popular === true,
      stock: product.stock ?? 50,
      lowStockAlerted: false,
      rating: 5,
      reviews: 0,
      order: index,
      demo: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  await batch.commit()
  return { categories: type.categories.length, products: type.products.length }
}
