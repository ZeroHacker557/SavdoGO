/**
 * «Shu qurilmada do'kon ochilgan» belgisi.
 *
 * Bitta ega — bitta do'kon. Asosiy tekshiruv serverda (telefon va
 * email band qilinadi — api/_lib/platform/owners.ts). Bu belgi esa
 * forma darajasida: do'kon ochgan kishi /start ni qayta ochsa, formani
 * to'ldirib, oxirida rad javobini olish o'rniga darhol «sizda do'kon
 * bor — admin panel yoki ikkinchi do'kon uchun ariza» ekranini ko'radi.
 * Belgi forma (yaratilganda) va admin panel (ega kirganda) tomonidan
 * qo'yiladi — ikkalasi bir domenda.
 */
const KEY = 'savdogo:owner-shop'

export type OwnerMarker = { slug: string; name: string }

export function rememberOwnerShop(slug: string, name: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ slug, name }))
  } catch {
    /* saqlash yopiq — server baribir tekshiradi */
  }
}

export function ownerShopMarker(): OwnerMarker | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<OwnerMarker> | null
    return value && typeof value.slug === 'string' && value.slug
      ? { slug: value.slug, name: String(value.name || value.slug) }
      : null
  } catch {
    return null
  }
}

/** Do'kon o'chirilgan bo'lsa — belgi ham olib tashlanadi. */
export function forgetOwnerShop() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* saqlash yopiq */
  }
}
