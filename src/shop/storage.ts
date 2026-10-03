import { activeShopId } from './active'

/**
 * Do'konga bog'langan localStorage kaliti.
 *
 * Subdomenda har do'kon o'z «origin»ida, lekin lokal sinovda
 * (`?shop=`) va o'z domenlarda bir nechta do'kon bitta brauzer
 * xotirasini bo'lishadi — savat va sevimlilar aralashib ketmasin.
 * Funksiya, konstanta emas: modul yuklanganda do'kon hali noma'lum.
 */
export function shopKey(name: string): string {
  return `savdogo:${activeShopId()}:${name}`
}
