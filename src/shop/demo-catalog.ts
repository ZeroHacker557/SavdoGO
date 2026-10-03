import { businessType, type BusinessTypeId } from '../platform/business-types'
import type { Category, Product } from '../types/domain'

/**
 * Oldindan ko'rish rejimidagi katalog — bazasiz.
 *
 * Ro'yxatdan o'tish formasida «Saytni ko'rish» bosilganda do'kon hali
 * yaratilmagan bo'ladi. Shunda katalog biznes turining namunasidan
 * yig'iladi — server do'kon yaratganda yozadigan mahsulotlar bilan
 * aynan bir xil (api/_lib/platform/seed.ts).
 */
function sized(url: string, width: number): string {
  return url.replace(/([?&])w=\d+/, `$1w=${width}`)
}

export function demoCategories(type: BusinessTypeId): Category[] {
  return businessType(type).categories.map((category, index) => ({
    id: 1000 + index,
    name: category.name,
    nameRu: category.nameRu,
    icon: category.icon,
    order: index,
  }))
}

export function demoProducts(type: BusinessTypeId): Product[] {
  return businessType(type).products.map((product, index) => {
    const image = sized(product.image, 1200)
    return {
      id: 500000 + index,
      name: product.name,
      nameRu: product.nameRu,
      price: product.price,
      oldPrice: product.oldPrice && product.oldPrice > product.price ? product.oldPrice : undefined,
      category: product.category,
      images: [image],
      thumbs: [sized(product.image, 480)],
      optimized: [image],
      variantSources: [image],
      rating: 5,
      reviews: 0,
      sizes: product.sizes ?? [],
      color: (product.colors ?? []).join(', '),
      description: product.description,
      descriptionRu: product.descriptionRu ?? '',
      stock: product.stock ?? 50,
      order: index,
      sectionId: null,
      popular: product.popular === true,
    }
  })
}
