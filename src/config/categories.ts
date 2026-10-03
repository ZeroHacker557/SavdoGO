/**
 * Kategoriya va bo'lim nomlarini ko'rsatish.
 *
 * ⚠️ `name` — mahsulotning Firestore'dagi `category` maydoni bilan
 * AYNAN mos: filtr shu bo'yicha ishlaydi, shuning uchun u hech qachon
 * tarjima qilinmaydi. Bu funksiyalar faqat KO'RINISHNI beradi: ruscha
 * tilda tarjima bo'lsa o'sha, bo'lmasa o'zbekchasi.
 */
export function categoryLabel(category: { name: string; nameRu?: string }, lang: string): string {
  return lang === 'ru' ? category.nameRu || category.name : category.name
}

/** Bo'lim sarlavhasi — kategoriyadagi kabi. */
export function sectionLabel(section: { name: string; nameRu?: string }, lang: string): string {
  return lang === 'ru' ? section.nameRu || section.name : section.name
}
