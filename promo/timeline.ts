/**
 * Reklama videosining vaqt jadvali — sahnalar va subtitrlar (soniya).
 *
 * Sahnalar 0.3 s ustma-ust keladi (biri so'nayotganda keyingisi
 * chiqadi). Subtitrlar ovoz yozish uchun matn ham: render.mjs ulardan
 * .srt va diktor matnini (.txt) chiqaradi.
 */
export const SCENES = {
  intro: { start: 0, len: 5.7 },
  problem: { start: 5.4, len: 6.9 },
  build: { start: 12.0, len: 8.3 },
  types: { start: 20.0, len: 8.3 },
  client: { start: 28.0, len: 8.3 },
  admin: { start: 36.0, len: 8.3 },
  telegram: { start: 44.0, len: 6.3 },
  trial: { start: 50.0, len: 5.0 },
  pricing: { start: 54.7, len: 6.3 },
  cta: { start: 60.7, len: 6.6 },
} as const

export type SceneId = keyof typeof SCENES

export const DURATION = 67.3

export const SUBTITLES: { start: number; end: number; text: string }[] = [
  { start: 0.6, end: 5.2, text: 'Biznesingizni internetga olib chiqmoqchimisiz?' },
  { start: 5.8, end: 8.8, text: 'Sayt yasatish — qimmat, uzoq va murakkab.' },
  { start: 9.0, end: 11.8, text: 'SavdoGO bilan esa hammasi bir necha daqiqada.' },
  { start: 12.3, end: 15.9, text: 'Biznes turini tanlang, logo va rangni qo‘ying —' },
  { start: 16.0, end: 19.7, text: 'sayt, savat va admin panel o‘zi yig‘iladi.' },
  { start: 20.3, end: 23.8, text: 'Restoran, kiyim do‘koni, gullar, mebel —' },
  { start: 23.9, end: 27.7, text: 'har qanday biznes uchun tayyor andozalar.' },
  { start: 28.3, end: 31.8, text: 'Mijozlaringiz uchun telefonda ilovadek qulay do‘kon:' },
  { start: 31.9, end: 35.7, text: 'qidiruv, savat, yetkazib berish va buyurtma kuzatuvi.' },
  { start: 36.3, end: 39.8, text: 'Siz esa buyurtmalarni real vaqtda ko‘rasiz' },
  { start: 39.9, end: 43.7, text: 'va mahsulot, aksiya, hisobotlarni bir joydan boshqarasiz.' },
  { start: 44.3, end: 47.2, text: 'Yangi buyurtmalar — darhol Telegram’ingizga,' },
  { start: 47.3, end: 49.8, text: 'kuryerlar esa jonli xaritada.' },
  { start: 50.3, end: 52.6, text: 'Eng asosiysi — birinchi 10 kun bepul!' },
  { start: 52.7, end: 54.6, text: 'Hamma imkoniyatlar ochiq, karta kerak emas.' },
  { start: 55.0, end: 57.9, text: 'Keyin esa — oyiga atigi 199 000 so‘m.' },
  { start: 58.0, end: 60.5, text: 'Yashirin to‘lovlarsiz, xohlagan payt boshlang.' },
  { start: 61.1, end: 63.9, text: 'SavdoGO — do‘koningizni bugun oching!' },
  { start: 64.0, end: 67.0, text: 'savdogo.shop — 10 kun bepul sinab ko‘ring' },
]
