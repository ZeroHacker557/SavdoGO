/**
 * 30 soniyalik tezkor versiyaning vaqt jadvali (soniya).
 *
 * 120 BPM: har zarb 0.5 s, har takt 2 s — almashuvlar zarbaga tushadi,
 * musiqa (music.mjs → SHORT) va effektlar (sfx.mjs → scoreShort) shu bilan
 * sinxron. Sahnalar «qatlam»lar: ustma-ust keladi, z — qaysi biri
 * ustida turishi (o'tishlar shu bilan uzluksiz chiqadi).
 */
export const LAYERS = {
  hook: { start: 0, len: 2.3, z: 10 },
  brand: { start: 1.7, len: 2.8, z: 50 },
  buildBg: { start: 3.4, len: 5.0, z: 30 },
  build: { start: 3.6, len: 4.9, z: 40 },
  typesBg: { start: 7.75, len: 4.5, z: 35 },
  types: { start: 7.9, len: 4.4, z: 45 },
  clientBg: { start: 11.7, len: 4.6, z: 38 },
  client: { start: 11.8, len: 4.6, z: 48 },
  admin: { start: 15.5, len: 4.9, z: 60 },
  trial: { start: 19.6, len: 4.6, z: 70 },
  price: { start: 23.6, len: 2.8, z: 80 },
  cta: { start: 25.9, len: 4.1, z: 90 },
} as const

export type LayerId = keyof typeof LAYERS

export const DURATION = 30

/** Biznes turlari telefon ichida almashadi — har zarbda bittadan. */
export const SWAPS = [8.0, 8.5, 9.0, 9.5, 10.0, 10.5]

export const SUBTITLES: { start: number; end: number; text: string }[] = [
  { start: 0.15, end: 1.95, text: 'Onlayn do‘kon ochish qiyinmi?' },
  { start: 2.05, end: 3.6, text: 'SavdoGO bilan — 5 daqiqada tayyor!' },
  { start: 3.9, end: 7.7, text: 'Biznes turini tanlang — do‘koningiz o‘zi yig‘iladi.' },
  { start: 8.0, end: 11.6, text: 'Restoran, gullar, mebel — har qanday biznes uchun.' },
  { start: 12.0, end: 15.3, text: 'Mijozlaringiz uchun — ilovadek qulay.' },
  { start: 15.7, end: 19.5, text: 'Buyurtma, tushum va kuryerlar — hammasi bir joyda.' },
  { start: 19.9, end: 23.4, text: 'Birinchi 10 kun — bepul! Karta kerak emas.' },
  { start: 23.8, end: 25.7, text: 'Keyin oyiga atigi 199 000 so‘m.' },
  { start: 26.1, end: 29.7, text: 'savdogo.shop — do‘koningizni bugun oching!' },
]
