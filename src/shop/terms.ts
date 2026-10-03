import type { TranslationKey } from '../i18n/uz'
import { businessType } from '../platform/business-types'
import { activeShop } from './active'

/**
 * Biznes turiga mos so'zlar — i18n lug'ati ustidan yoziladi.
 *
 * Restoranda «Katalog» emas «Menyu», o'lcham o'rniga «Porsiya»;
 * elektronikada «Xotira». Asosiy lug'at (uz.ts / ru.ts) umumiy
 * so'zlarda qoladi, bu yerda faqat turga bog'liqlari almashtiriladi.
 * Hero sarlavhasi ham shu yerdan — har tur o'z gapi bilan ochiladi.
 */
export function shopTerms(lang: 'uz' | 'ru'): Partial<Record<TranslationKey, string>> {
  let shop
  try {
    shop = activeShop()
  } catch {
    return {}
  }
  const type = businessType(shop.type)
  const ru = lang === 'ru'
  const catalog = ru ? type.terms.catalogRu : type.terms.catalog
  const size = ru ? type.terms.sizeLabelRu : type.terms.sizeLabel
  const color = ru ? type.terms.colorLabelRu : type.terms.colorLabel

  return {
    'nav.catalog': catalog,
    'catalog.title': catalog,
    'catalog.short': catalog,
    'home.openCatalog': ru ? `Открыть ${catalog.toLowerCase()}` : `${catalog}ni ochish`,
    'catalog.size': size,
    'catalog.color': color,
    'cart.size': size,
    'cart.color': color,
    'product.chooseSize': ru ? `Выберите: ${size.toLowerCase()}` : `${size}ni tanlang`,
    'product.chooseColor': ru ? `Выберите: ${color.toLowerCase()}` : `${color}ni tanlang`,
    'brand.tagline': shop.tagline || (ru ? type.nameRu : type.name),
    // Ega o'z matnini yozgan bo'lsa — o'sha (ikkala tilda ham), bo'lmasa turning standarti
    'home.heroTitle': shop.hero?.title || (ru ? type.hero.titleRu : type.hero.title),
    'home.heroSubtitle': shop.hero?.subtitle || (ru ? type.hero.subtitleRu : type.hero.subtitle),
  }
}
