import type { LucideIcon } from 'lucide-react'
import {
  Armchair, Cake, Flower2, Footprints, Gem, Package, Shirt, ShoppingBasket, Smartphone, Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import type { BusinessTypeId } from './business-types'

/**
 * Biznes turlarining ikonkasi — faqat brauzer uchun.
 * Ma'lumot (business-types.ts) serverda ham ishlatiladi, shuning
 * uchun ikonkalar alohida faylda.
 */
const ICONS: Record<BusinessTypeId, LucideIcon> = {
  restaurant: UtensilsCrossed,
  clothing: Shirt,
  shoes: Footprints,
  accessories: Gem,
  furniture: Armchair,
  grocery: ShoppingBasket,
  cosmetics: Sparkles,
  electronics: Smartphone,
  flowers: Flower2,
  bakery: Cake,
  other: Package,
}

export function typeIcon(id: BusinessTypeId): LucideIcon {
  return ICONS[id] ?? Package
}
