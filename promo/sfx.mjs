/**
 * Reklama videosining ovoz effektlari — hammasi shu yerda kod bilan
 * sintez qilinadi (tashqi fayl yo'q, litsenziya muammosi yo'q).
 *
 * Vaqtlar timeline.ts dagi sahnalardan va Promo.tsx dagi animatsiya
 * kechikishlaridan olinadi: sahna surilsa, effektlar ham birga suriladi.
 *
 * 30 soniyalik versiyaning ssenariysi — scoreShort (short-timeline.ts va
 * Short.tsx / short.css dagi kechikishlar bo'yicha).
 *
 *   node promo/sfx.mjs          # promo/out/savdogo-sfx.wav va savdogo-30s-sfx.wav
 *   node promo/soundtrack.mjs   # effektlar + musiqa → videolarga (asosiy buyruq)
 *
 * Diktor ovozi montajda alohida qo'shiladi — effektlar unga xalaqit
 * bermasligi uchun nisbatan past darajada (peak −3 dBFS).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Biquad, SR, muxInto, reverb, rms, rng, writeWav } from './audio.mjs'
import { DURATION as LONG_DURATION, SCENES } from './timeline.ts'
import { DURATION as SHORT_DURATION, LAYERS, SWAPS } from './short-timeline.ts'

export { muxInto }

const out = join(dirname(fileURLToPath(import.meta.url)), 'out')

/** Oxirgi sahnada 1 soniyada yoziladigan «savdogo.shop» harflari soni (promo.css → pvType steps). */
const URL_KEYS = 'savdogo.shop'.length

/* ── Asboblar ─────────────────────────────────────────────── */

let seed = 1
const noiseGen = () => {
  const r = rng(seed++ * 7919)
  return () => r() * 2 - 1
}

const buffer = (seconds) => new Float32Array(Math.round(seconds * SR))
const attack = (t, time = 0.004) => Math.min(1, t / time)

/** Har tovush cho'qqisi 1 ga keltiriladi — miksdagi `gain` shunda tushunarli. */
function norm(buf, peak = 1) {
  let max = 0
  for (const v of buf) max = Math.max(max, Math.abs(v))
  if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / max
  return buf
}

/** Sinus ohang: chastota f(t), amplituda a(t); harmonics — [ko'paytma, ulush]. */
function tone(seconds, f, a, harmonics = [[1, 1]]) {
  const buf = buffer(seconds)
  let phase = 0
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    phase += (2 * Math.PI * f(t)) / SR
    let s = 0
    for (const [h, g] of harmonics) s += Math.sin(phase * h) * g
    buf[i] = s * a(t)
  }
  return buf
}

/* ── Tovushlar ────────────────────────────────────────────── */

/** Havo oqimi: shovqin filtri `from` → `to` Hz ga suriladi. */
function whoosh(seconds, from, to, { q = 1.2, peak = 0.55 } = {}) {
  const buf = buffer(seconds)
  const noise = noiseGen()
  const bp = new Biquad('bp', from, q)
  const lp = new Biquad('lp', 9000)
  for (let i = 0; i < buf.length; i++) {
    const x = i / buf.length
    if (i % 16 === 0) bp.set(from * Math.pow(to / from, x), q)
    const env = x < peak ? Math.pow(x / peak, 2) : Math.pow(1 - (x - peak) / (1 - peak), 1.6)
    buf[i] = lp.run(bp.run(noise())) * env
  }
  return norm(buf)
}

const sfx = {
  /** Pufak «pop» — element paydo bo'lganda. */
  pop: (f = 620) =>
    norm(tone(0.16, (t) => f * (0.7 + 1.1 * Math.exp(-t / 0.025)), (t) => attack(t, 0.002) * Math.exp(-t / 0.045), [[1, 1], [2, 0.18]])),
  /** Ohangdor «tik» — harflar, qadamlar. */
  tick: (f) =>
    norm(tone(0.3, () => f, (t) => attack(t, 0.002) * Math.exp(-t / 0.07), [[1, 1], [2, 0.35], [3, 0.12], [4.2, 0.06]])),
  /** Qisqa signal — ketma-ket ko'tariluvchi qatorlar uchun. */
  blip: (f) => norm(tone(0.18, (t) => f * (1 + 0.04 * Math.exp(-t / 0.01)), (t) => attack(t, 0.003) * Math.exp(-t / 0.05), [[1, 1], [3, 0.2]])),
  /** Qo'ng'iroq ohangi. */
  bell: (f, decay = 0.6) =>
    norm(tone(decay * 3, () => f, (t) => attack(t, 0.003) * Math.exp(-t / decay), [[1, 1], [2, 0.3], [2.76, 0.18], [5.4, 0.06]])),
  /** Uchqun — juda qisqa baland ohang. */
  ping: (f) => norm(tone(0.25, () => f, (t) => attack(t, 0.001) * Math.exp(-t / 0.05), [[1, 1], [2.01, 0.2]])),
  /** Chuqur zarba: past chastota + urilish shovqini. */
  impact: (f = 52, decay = 0.55) => {
    const body = tone(decay * 3.2, (t) => f * (1 + 2.2 * Math.exp(-t / 0.035)), (t) => attack(t, 0.002) * Math.exp(-t / decay))
    const knock = tone(0.4, (t) => 150 * (1 + Math.exp(-t / 0.02)), (t) => Math.exp(-t / 0.07))
    const noise = noiseGen()
    const lp = new Biquad('lp', 2600)
    for (let i = 0; i < body.length; i++) {
      const t = i / SR
      const n = lp.run(noise()) * Math.exp(-t / 0.03) * 0.8
      body[i] = Math.tanh(1.6 * (body[i] + (i < knock.length ? knock[i] * 0.6 : 0) + n))
    }
    return norm(body)
  },
  /** Yumshoq «tup» — so'z tushishi, quti silkinishi. */
  thud: (f = 100) => {
    const buf = tone(0.45, (t) => f * (1 + 0.8 * Math.exp(-t / 0.02)), (t) => attack(t, 0.002) * Math.exp(-t / 0.09))
    const noise = noiseGen()
    const lp = new Biquad('lp', 900)
    for (let i = 0; i < buf.length; i++) buf[i] += lp.run(noise()) * Math.exp(-i / SR / 0.015) * 0.7
    return norm(buf)
  },
  /** Muhr «taq» — qizil X tushganda. */
  stamp: () => {
    const buf = sfx.thud(120)
    const noise = noiseGen()
    const bp = new Biquad('bp', 1700, 0.8)
    for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * 0.9 + bp.run(noise()) * Math.exp(-i / SR / 0.05) * 1.4
    return norm(buf)
  },
  /** Ko'tariluvchi shovqin — zarbadan oldin taranglik. */
  riser: (seconds) => {
    const buf = buffer(seconds)
    const noise = noiseGen()
    const bp = new Biquad('bp', 300, 0.9)
    let phase = 0
    for (let i = 0; i < buf.length; i++) {
      const x = i / buf.length
      if (i % 16 === 0) bp.set(300 * Math.pow(25, x), 0.9)
      phase += (2 * Math.PI * 180 * Math.pow(4, x)) / SR
      const env = Math.pow(x, 2.4) * (x > 0.97 ? (1 - x) / 0.03 : 1)
      buf[i] = (bp.run(noise()) + Math.sin(phase) * 0.08) * env
    }
    return norm(buf)
  },
  /** Konfetti «paq»i. */
  popper: () => {
    const buf = buffer(0.5)
    const noise = noiseGen()
    const bp = new Biquad('bp', 2200, 0.6)
    const low = sfx.pop(180)
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR
      buf[i] = bp.run(noise()) * 3 * Math.exp(-t / 0.035) * attack(t, 0.001) + (i < low.length ? low[i] * 0.8 : 0)
    }
    return norm(buf)
  },
  /** Klaviatura tugmasi. */
  key: (variant = 0) => {
    const buf = buffer(0.08)
    const noise = noiseGen()
    const bp = new Biquad('bp', 3000 + variant * 600, 1.5)
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR
      buf[i] = bp.run(noise()) * 3 * Math.exp(-t / 0.008) + Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t / 0.012) * 0.5
    }
    return norm(buf)
  },
  /** Ekranga bosish «chiq». */
  click: () => {
    const buf = buffer(0.06)
    const noise = noiseGen()
    const hp = new Biquad('hp', 2500)
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR
      buf[i] = hp.run(noise()) * Math.exp(-t / 0.004) + Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t / 0.012) * 0.6
    }
    return norm(buf)
  },
  /** Tugma pulsatsiyasi — yumshoq past «vum». */
  whomp: () => norm(tone(0.7, (t) => 75 * (1 + 0.5 * Math.exp(-t / 0.05)), (t) => attack(t, 0.02) * Math.exp(-t / 0.18))),
}

/* ── Miks ─────────────────────────────────────────────────── */

let N = 0
let dryL, dryR, send

/** Shinalarni yangi uzunlikka tayyorlaydi; tasodif ham boshidan — natija har safar bir xil. */
function init(duration) {
  N = Math.ceil(duration * SR)
  dryL = new Float32Array(N)
  dryR = new Float32Array(N)
  send = new Float32Array(N)
  seed = 1
}

/** Tovushni t-soniyaga qo'yadi. pan: −1 (chap) … 1 (o'ng) yoki [boshi, oxiri]. */
function place(t, buf, { gain = 1, pan = 0, rev = 0.2 } = {}) {
  const start = Math.round(t * SR)
  const [p0, p1] = Array.isArray(pan) ? pan : [pan, pan]
  for (let i = 0; i < buf.length; i++) {
    const j = start + i
    if (j < 0 || j >= N) continue
    const angle = ((p0 + (p1 - p0) * (i / buf.length) + 1) * Math.PI) / 4
    const v = buf[i] * gain
    dryL[j] += v * Math.cos(angle)
    dryR[j] += v * Math.sin(angle)
    send[j] += v * rev
  }
}

/** Uchqunlar to'plami: boshida zich, keyin siyraklashadi. */
function sparkle(t, seconds, count, gain = 0.3) {
  const r = rng(seed++ * 104729)
  for (let k = 0; k < count; k++) {
    const offset = Math.pow(r(), 1.6) * seconds
    place(t + offset, sfx.ping(2400 + r() * 4600), {
      gain: gain * (0.5 + r() * 0.5) * (1 - (offset / seconds) * 0.6),
      pan: r() * 1.6 - 0.8,
      rev: 0.45,
    })
  }
}

/** Akkord — notalar biroz ketma-ket («arfa» kabi). */
function chord(t, freqs, gain = 0.3, spread = 0.03) {
  freqs.forEach((f, i) => place(t + i * spread, sfx.bell(f, 0.7), { gain: gain / Math.sqrt(freqs.length), pan: -0.4 + (0.8 * i) / Math.max(1, freqs.length - 1), rev: 0.4 }))
}

const notifyChime = (t, gain = 0.4, pan = 0) => {
  place(t, sfx.bell(1318.5, 0.35), { gain, pan, rev: 0.3 })
  place(t + 0.11, sfx.bell(1760, 0.5), { gain, pan, rev: 0.3 })
}
const coin = (t, gain = 0.35, pan = 0) => {
  place(t, sfx.bell(1975.5, 0.08), { gain, pan, rev: 0.3 })
  place(t + 0.075, sfx.bell(2637, 0.5), { gain, pan, rev: 0.3 })
}
const telegramPing = (t, gain = 0.4, pan = 0) => {
  place(t, sfx.blip(1046.5), { gain, pan, rev: 0.25 })
  place(t + 0.07, sfx.bell(1568, 0.3), { gain, pan, rev: 0.25 })
}

/* ── Ssenariy: har animatsiyaga o'z tovushi ───────────────── */

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093]
const S = Object.fromEntries(Object.entries(SCENES).map(([id, scene]) => [id, scene.start]))
/** data-count sanog'i: ease-out kubik — qiymat k/n ga yetadigan lahzalar. */
const countTimes = (at, dur, n) => Array.from({ length: n }, (_, k) => at + (1 - Math.pow(1 - (k + 1) / n, 1 / 3)) * dur)

function scoreLong() {
  // Sahnalar orasidagi o'tishlar
  Object.values(SCENES).forEach(({ start }, i) => {
    if (!start) return
    const up = i % 2 === 0
    place(start - 0.3, whoosh(0.95, up ? 350 : 3800, up ? 4200 : 380), { gain: 0.42, pan: up ? [-0.7, 0.7] : [0.7, -0.7], rev: 0.25 })
  })

  // 1. Kirish: harflar, «GO» zarbasi, yaltirash
  place(0, sfx.riser(0.8), { gain: 0.3, rev: 0.3 })
  for (let i = 0; i < 5; i++) place(0.4 + i * 0.06, sfx.tick(PENTA[i]), { gain: 0.26, pan: -0.5 + i * 0.2 })
  place(0.77, sfx.impact(50), { gain: 0.95, rev: 0.35 })
  place(0.77, sfx.pop(520), { gain: 0.45 })
  sparkle(1.45, 0.9, 14, 0.2)
  place(1.55, whoosh(0.8, 600, 2600, { peak: 0.4 }), { gain: 0.16 })

  // 2. Muammo: so'zlar tushadi, kartalar uchadi, X muhrlanadi, «5 daqiqada» portlaydi
  const P = S.problem
  ;[0.2, 0.32, 0.44].forEach((d, i) => place(P + d + 0.12, sfx.thud(130 - i * 12), { gain: 0.38, pan: -0.4 + i * 0.4 }))
  ;[0.6, 0.78, 0.96].forEach((d, i) => place(P + d, whoosh(0.45, 500, 3000, { peak: 0.45 }), { gain: 0.28, pan: [-0.7 + i * 0.7, -0.5 + i * 0.5] }))
  ;[2.0, 2.4, 2.8].forEach((d, i) => place(P + d + 0.42, sfx.stamp(), { gain: 0.62, pan: -0.55 + i * 0.55 }))
  place(P + 3.35, sfx.riser(0.68), { gain: 0.28 })
  place(P + 3.62, whoosh(0.7, 4200, 300, { peak: 0.3 }), { gain: 0.36 })
  place(P + 4.0, sfx.impact(46, 0.7), { gain: 1, rev: 0.4 })
  chord(P + 4.05, [523.25, 659.25, 783.99, 1046.5], 0.32)
  sparkle(P + 4.0, 1.2, 18, 0.18)

  // 3. Yig'ilish: qadamlar belgilanadi, bo'laklar telefonga uchadi, buyurtma keladi
  const B = S.build
  place(B + 0.15, whoosh(0.7, 500, 2400), { gain: 0.16 })
  ;[0.3, 1.0, 1.7, 2.5, 3.2].forEach((t, i) => {
    place(B + t, sfx.blip(PENTA[2 + i]), { gain: 0.3, pan: -0.45 })
    place(B + t, sfx.pop(900 + i * 80), { gain: 0.12, pan: -0.45 })
  })
  ;[0, 0.7, 1.4, 2.1].forEach((t, i) => place(B + t + 0.65, whoosh(0.32, 900, 3500, { peak: 0.7 }), { gain: 0.12, pan: [i % 2 ? 0.7 : 0.15, 0.4] }))
  place(B + 3.9, sfx.pop(760), { gain: 0.25, pan: 0.35 })
  notifyChime(B + 3.95, 0.42, 0.35)

  // 4. Biznes turlari: telefonlar aylanib kiradi, «11 ta andoza»
  const T = S.types
  place(T + 0.1, whoosh(0.7, 500, 2400), { gain: 0.16 })
  for (let i = 0; i < 5; i++) place(T + 0.35 + i * 0.16, whoosh(0.55, 700, 2600, { peak: 0.35 }), { gain: 0.24, pan: [-0.9 + i * 0.4, -0.8 + i * 0.4] })
  place(T + 3.9, sfx.pop(700), { gain: 0.42, pan: 0.6 })
  sparkle(T + 3.95, 0.7, 10, 0.18)

  // 5. Mijoz: imkoniyatlar chiqadi, bosish va «+1»
  const C = S.client
  place(C + 0.1, whoosh(0.7, 500, 2400), { gain: 0.16 })
  ;[-0.6, -0.75, -0.6, 0.6, 0.75, 0.6].forEach((pan, i) => place(C + 0.8 + i * 0.32, sfx.pop(560 + (i % 3) * 90), { gain: 0.36, pan }))
  place(C + 3.2, sfx.click(), { gain: 0.5 })
  place(C + 3.38, sfx.blip(1318.5), { gain: 0.26 })
  place(C + 3.46, sfx.blip(1760), { gain: 0.26 })

  // 6. Admin: oyna tekislanadi, tushum sanaladi, grafik o'sadi, bildirishnoma
  const A = S.admin
  place(A, whoosh(1.4, 200, 1400, { q: 0.8, peak: 0.35 }), { gain: 0.38, rev: 0.3 })
  ;[0.5, 0.62, 0.74].forEach((d, i) => place(A + d, whoosh(0.4, 900, 3200, { peak: 0.5 }), { gain: 0.1, pan: -0.4 + i * 0.3 }))
  countTimes(A + 0.6, 2.4, 24).forEach((t, k) => place(t, sfx.tick(2093 + (k % 2) * 150), { gain: 0.07, pan: -0.3 }))
  coin(A + 3.0, 0.32, -0.3)
  for (let i = 0; i < 12; i++) place(A + 1.1 + i * 0.07, sfx.blip(PENTA[i % PENTA.length] / 2), { gain: 0.12, pan: -0.2 + i * 0.03 })
  for (let i = 0; i < 4; i++) place(A + 1.4 + i * 0.22, whoosh(0.4, 1200, 3500, { peak: 0.5 }), { gain: 0.09, pan: [0.8, 0.5] })
  place(A + 4.4, whoosh(0.5, 900, 3000), { gain: 0.14, pan: [0.9, 0.5] })
  notifyChime(A + 4.55, 0.42, 0.5)

  // 7. Telegram: xabar, «Qabul qilish», xarita, kuryer
  const G = S.telegram
  place(G + 0.15, sfx.thud(160), { gain: 0.18 })
  place(G + 0.25, whoosh(0.6, 400, 2600), { gain: 0.22, pan: [-0.8, -0.4] })
  place(G + 0.45, whoosh(0.6, 400, 2600), { gain: 0.22, pan: [0.8, 0.4] })
  telegramPing(G + 0.85, 0.4, -0.4)
  place(G + 1.2, whoosh(1.6, 500, 1800, { q: 2, peak: 0.6 }), { gain: 0.1, pan: [0.2, 0.6] })
  place(G + 2.3, sfx.click(), { gain: 0.5, pan: -0.4 })
  place(G + 2.75, sfx.pop(760), { gain: 0.3, pan: -0.4 })
  place(G + 2.8, sfx.bell(1568, 0.4), { gain: 0.2, pan: -0.4 })
  place(G + 2.9, whoosh(3.0, 180, 650, { q: 0.7, peak: 0.5 }), { gain: 0.1, pan: [0.1, 0.7] })
  place(G + 3.1, sfx.pop(880), { gain: 0.28, pan: 0.3 })

  // 8. 10 kun bepul: quti silkinadi, ochiladi, konfetti, kunlar yonadi
  const R = S.trial
  place(R + 0.15, sfx.thud(170), { gain: 0.2 })
  place(R + 0.25, sfx.pop(380), { gain: 0.45 })
  place(R + 0.25, sfx.impact(70, 0.25), { gain: 0.3 })
  place(R + 0.55, sfx.riser(0.6), { gain: 0.3 })
  ;[0.7, 0.79, 0.88, 0.97, 1.05].forEach((d, i) => place(R + d, sfx.thud(210 + (i % 2) * 30), { gain: 0.28, pan: i % 2 ? 0.25 : -0.25 }))
  place(R + 1.13, sfx.popper(), { gain: 0.8, rev: 0.35 })
  place(R + 1.13, sfx.impact(55, 0.6), { gain: 0.7, rev: 0.35 })
  sparkle(R + 1.15, 1.7, 30, 0.2)
  chord(R + 1.3, [523.25, 659.25, 783.99, 1046.5, 1318.51], 0.3)
  countTimes(R + 1.3, 0.75, 10).forEach((t, k) => place(t, sfx.tick(PENTA[k]), { gain: 0.12 }))
  for (let i = 0; i < 10; i++) place(R + 2.1 + i * 0.07, sfx.blip(PENTA[i]), { gain: 0.2, pan: -0.6 + i * 0.13 })
  for (let i = 0; i < 3; i++) place(R + 2.75 + i * 0.16, sfx.pop(600 + i * 90), { gain: 0.32, pan: -0.5 + i * 0.5 })

  // 9. Narxlar: kartalar ko'tariladi, «10 kun bepul» lentasi
  const Q = S.pricing
  place(Q + 0.1, whoosh(0.7, 500, 2400), { gain: 0.16 })
  for (let i = 0; i < 3; i++) place(Q + 0.45 + i * 0.18, whoosh(0.5, 600, 3000, { peak: 0.4 }), { gain: 0.28, pan: [-0.6 + i * 0.6, -0.5 + i * 0.5] })
  place(Q + 1.0, sfx.pop(700), { gain: 0.4 })
  sparkle(Q + 1.02, 0.6, 8, 0.16)
  place(Q + 1.3, sfx.pop(900), { gain: 0.22 })

  // 10. Yakun: logo zarbasi, domen yoziladi, tugma
  const E = S.cta
  for (let i = 0; i < 5; i++) place(E + 0.25 + i * 0.06, sfx.tick(PENTA[i + 2]), { gain: 0.24, pan: -0.5 + i * 0.2 })
  place(E + 0.62, sfx.impact(44, 0.9), { gain: 1, rev: 0.45 })
  place(E + 0.62, sfx.pop(520), { gain: 0.45 })
  sparkle(E + 1.3, 1.0, 16, 0.2)
  place(E + 1.3, whoosh(0.8, 600, 2600), { gain: 0.14 })
  for (let k = 0; k < URL_KEYS; k++) place(E + 1.6 + k / URL_KEYS, sfx.key(k % 3), { gain: 0.28, pan: -0.15 + (k % 3) * 0.15 })
  place(E + 2.6, sfx.pop(600), { gain: 0.5 })
  place(E + 2.6, sfx.impact(60, 0.35), { gain: 0.4 })
  chord(E + 2.7, [659.25, 783.99, 987.77, 1318.51], 0.3)
  ;[3.3, 4.9].forEach((d) => place(E + d, sfx.whomp(), { gain: 0.18 }))
}

/** 30 soniyalik versiya: sahnalar bir-biriga oqib o'tadi — har o'tishga o'z tovushi. */
function scoreShort() {
  const L = Object.fromEntries(Object.entries(LAYERS).map(([id, layer]) => [id, layer.start]))

  // 0–2: so'zlar urilib tushadi, «qiyinmi?» silkinadi, X belgilar
  ;[0.05, 0.25, 0.45].forEach((t, i) => {
    place(t - 0.06, whoosh(0.2, 3200, 700, { peak: 0.6 }), { gain: 0.12, pan: -0.3 + i * 0.3 })
    place(t + 0.05, sfx.thud(150 - i * 15), { gain: 0.5, pan: -0.3 + i * 0.3 })
  })
  place(0.84, whoosh(0.22, 3600, 600, { peak: 0.6 }), { gain: 0.16 })
  place(0.95, sfx.impact(72, 0.28), { gain: 0.55, rev: 0.25 })
  ;[1.24, 1.33, 1.42].forEach((t, i) => place(t, sfx.thud(220 + i * 25), { gain: 0.16, pan: i % 2 ? 0.3 : -0.3 }))
  ;[1.15, 1.3, 1.45].forEach((t, i) => place(t + 0.08, sfx.stamp(), { gain: 0.42, pan: -0.5 + i * 0.5 }))

  // 1.7–2.1: matn «so'riladi», lime doira portlaydi → SavdoGO
  place(1.62, whoosh(0.45, 4200, 260, { peak: 0.75 }), { gain: 0.4, rev: 0.3 })
  place(2.0, sfx.impact(48, 0.75), { gain: 1, rev: 0.4 })
  place(2.0, sfx.popper(), { gain: 0.35, rev: 0.3 })
  for (let i = 0; i < 5; i++) place(2.0 + i * 0.06, sfx.tick(PENTA[i + 2]), { gain: 0.24, pan: -0.5 + i * 0.2 })
  place(2.42, sfx.pop(520), { gain: 0.5 })
  place(2.55, whoosh(0.6, 600, 2400), { gain: 0.12 })
  sparkle(3.1, 0.7, 12, 0.18)

  // 3.5–4.2: lime fon telefon ekraniga aylanadi
  place(3.45, whoosh(0.75, 3600, 420, { q: 0.9, peak: 0.55 }), { gain: 0.4, rev: 0.3 })
  place(4.13, sfx.thud(110), { gain: 0.35 })
  place(4.15, sfx.pop(700), { gain: 0.22 })

  // 4–8: do'kon yig'iladi — bo'laklar telefonga uchadi
  const B = L.build
  place(B + 0.7, whoosh(0.6, 500, 2400), { gain: 0.12, pan: -0.5 })
  ;[1.0, 1.5, 2.0, 2.5].forEach((t, i) => {
    place(B + t, sfx.pop(640 + i * 70), { gain: 0.3, pan: -0.6 })
    place(B + t + 0.5, whoosh(0.45, 900, 3600, { peak: 0.75 }), { gain: 0.16, pan: [-0.6, 0.4] })
    place(B + t + 0.98, sfx.blip(PENTA[3 + i * 2]), { gain: 0.26, pan: 0.4 })
  })
  place(B + 0.95, sfx.pop(820), { gain: 0.2, pan: 0.4 })
  place(B + 1.6, whoosh(0.7, 400, 1600, { q: 0.8 }), { gain: 0.1, pan: 0.4 })
  ;[2.25, 2.32, 2.39, 2.46, 2.53].forEach((d, i) => place(B + d, sfx.tick(PENTA[i + 4]), { gain: 0.08, pan: 0.4 }))
  for (let i = 0; i < 4; i++) place(B + 2.45 + i * 0.12 + 0.3, sfx.thud(240 + i * 20), { gain: 0.14, pan: 0.4 })
  place(B + 3.1 + 0.35, whoosh(0.35, 700, 2400), { gain: 0.1, pan: 0.4 })
  place(B + 3.65, sfx.pop(980), { gain: 0.18, pan: 0.4 })
  place(B + 3.6, sfx.pop(600), { gain: 0.35, pan: 0.5 })
  chord(B + 3.65, [783.99, 987.77, 1174.66, 1567.98], 0.26)
  sparkle(B + 3.65, 0.6, 8, 0.15)

  // 8–12: qorong'i doira, har zarbda yangi biznes («slot»)
  place(7.55, whoosh(0.6, 300, 3000, { q: 0.9 }), { gain: 0.28, rev: 0.3 })
  SWAPS.forEach((t, i) => {
    place(t - 0.08, whoosh(0.32, 1200, 4200, { peak: 0.7 }), { gain: 0.2, pan: i % 2 ? 0.3 : -0.3 })
    place(t + 0.02, sfx.tick(PENTA[i + 2]), { gain: 0.22, pan: -0.4 })
    place(t + 0.05, sfx.thud(180), { gain: 0.14, pan: 0.4 })
  })
  place(L.types + 3.0, sfx.pop(700), { gain: 0.42, pan: -0.5 })
  sparkle(L.types + 3.05, 0.6, 10, 0.17)
  place(11.6, whoosh(0.4, 2400, 600), { gain: 0.12, pan: -0.5 })

  // 12–16: iliq doira, imkoniyatlar, bosish, bildirishnoma
  const C = L.client
  place(11.55, whoosh(0.6, 300, 3000, { q: 0.9 }), { gain: 0.26, rev: 0.3 })
  ;[-0.6, 0.6, -0.6, 0.6].forEach((pan, i) => place(C + 0.4 + i * 0.3, sfx.pop(560 + (i % 2) * 120), { gain: 0.34, pan }))
  place(C + 2.2, sfx.click(), { gain: 0.5, pan: 0.3 })
  place(C + 2.38, sfx.blip(1318.5), { gain: 0.24, pan: 0.3 })
  place(C + 2.46, sfx.blip(1760), { gain: 0.24, pan: 0.3 })
  place(C + 2.8, whoosh(0.3, 900, 2600), { gain: 0.1, pan: 0.3 })
  notifyChime(C + 2.9, 0.42, 0.3)

  // 15.5–16: bildirishnoma → admin oyna
  const A = L.admin
  place(A - 0.1, whoosh(0.55, 350, 3800, { q: 0.9, peak: 0.6 }), { gain: 0.36, pan: [0.3, 0], rev: 0.3 })
  place(A + 0.22, sfx.impact(64, 0.35), { gain: 0.42, rev: 0.3 })
  place(A + 0.25, sfx.pop(420), { gain: 0.3 })
  place(A + 0.55, sfx.thud(190), { gain: 0.2, pan: -0.4 })
  ;[0.4, 0.5, 0.6].forEach((d, i) => place(A + d, whoosh(0.35, 900, 3200, { peak: 0.5 }), { gain: 0.08, pan: -0.3 + i * 0.3 }))
  countTimes(A + 0.5, 1.7, 22).forEach((t, k) => place(t, sfx.tick(2093 + (k % 2) * 150), { gain: 0.07, pan: -0.2 }))
  coin(A + 2.2, 0.3, -0.2)
  for (let i = 0; i < 12; i++) place(A + 0.85 + i * 0.05, sfx.blip(PENTA[i % PENTA.length] / 2), { gain: 0.1, pan: -0.3 + i * 0.03 })
  for (let i = 0; i < 3; i++) place(A + 1.0 + i * 0.15, whoosh(0.35, 1200, 3500, { peak: 0.5 }), { gain: 0.08, pan: [0.8, 0.4] })
  place(A + 2.45, whoosh(0.4, 900, 3000), { gain: 0.12, pan: [0.9, 0.5] })
  telegramPing(A + 2.6, 0.42, 0.5)
  place(A + 3.0, sfx.pop(880), { gain: 0.3, pan: -0.4 })
  place(A + 3.05, whoosh(1.0, 180, 600, { q: 0.7 }), { gain: 0.08, pan: [-0.6, 0] })

  // 19.5–20: kamera ichkariga «kirib» ketadi → 10 kun bepul
  place(19.15, whoosh(0.85, 260, 5200, { q: 0.8, peak: 0.8 }), { gain: 0.42, rev: 0.35 })
  place(20.0, sfx.impact(52, 0.5), { gain: 0.7, rev: 0.4 })
  const R = L.trial
  place(R + 0.25, sfx.thud(170), { gain: 0.16 })
  place(R + 0.35, sfx.pop(380), { gain: 0.42 })
  ;[0.6, 0.69, 0.78, 0.87, 0.96].forEach((d, i) => place(R + d, sfx.thud(210 + (i % 2) * 30), { gain: 0.26, pan: i % 2 ? 0.25 : -0.25 }))
  place(R + 0.97, sfx.popper(), { gain: 0.8, rev: 0.35 })
  place(R + 0.97, sfx.impact(56, 0.55), { gain: 0.6, rev: 0.35 })
  sparkle(R + 1.0, 1.4, 26, 0.2)
  chord(R + 1.12, [523.25, 659.25, 783.99, 1046.5, 1318.51], 0.3)
  countTimes(R + 1.1, 0.6, 10).forEach((t, k) => place(t, sfx.tick(PENTA[k]), { gain: 0.12 }))
  for (let i = 0; i < 10; i++) place(R + 1.75 + i * 0.06, sfx.blip(PENTA[i]), { gain: 0.18, pan: -0.6 + i * 0.13 })
  ;[2.6, 2.75].forEach((d, i) => place(R + d, sfx.pop(620 + i * 110), { gain: 0.32, pan: i ? 0.4 : -0.4 }))

  // 23.6–26: narx pastdan «otilib» chiqadi, karta ekranni qoplaydi
  const P = L.price
  place(P - 0.12, whoosh(0.45, 300, 3600, { peak: 0.6 }), { gain: 0.36, pan: 0, rev: 0.25 })
  place(P + 0.3, sfx.thud(140), { gain: 0.3 })
  place(P + 0.3, sfx.pop(620), { gain: 0.3 })
  ;[0.5, 0.6].forEach((d, i) => place(P + d, whoosh(0.4, 700, 2800, { peak: 0.45 }), { gain: 0.16, pan: i ? [0.8, 0.5] : [-0.8, -0.5] }))
  countTimes(P + 0.45, 0.7, 14).forEach((t, k) => place(t, sfx.tick(1568 + (k % 2) * 200), { gain: 0.09 }))
  coin(P + 1.15, 0.32)
  place(25.45, whoosh(0.55, 300, 4600, { q: 0.8, peak: 0.85 }), { gain: 0.4, rev: 0.35 })

  // 26–30: yakun — logo, domen, tugma
  const E = L.cta
  place(26.0, sfx.impact(44, 0.9), { gain: 1, rev: 0.45 })
  for (let i = 0; i < 5; i++) place(E + 0.15 + i * 0.06, sfx.tick(PENTA[i + 2]), { gain: 0.22, pan: -0.5 + i * 0.2 })
  place(E + 0.57, sfx.pop(520), { gain: 0.45 })
  sparkle(E + 1.25, 0.9, 14, 0.18)
  place(E + 0.85, whoosh(0.7, 600, 2600), { gain: 0.12 })
  for (let k = 0; k < URL_KEYS; k++) place(E + 1.05 + k / URL_KEYS, sfx.key(k % 3), { gain: 0.26, pan: -0.15 + (k % 3) * 0.15 })
  place(E + 1.6, sfx.pop(600), { gain: 0.5 })
  place(E + 1.6, sfx.impact(60, 0.35), { gain: 0.4 })
  chord(E + 1.7, [659.25, 783.99, 987.77, 1318.51], 0.3)
  ;[2.2, 3.8].forEach((d) => place(E + d, sfx.whomp(), { gain: 0.18 }))
}

const SCORES = { 67: [LONG_DURATION, scoreLong], 30: [SHORT_DURATION, scoreShort] }

/* ── Yig'ish va yozish ────────────────────────────────────── */

const rendered = new Map()

/** Effektlar dorojkasi (float, cheklanmagan) — musiqa bilan miks qilish uchun. cut: '67' yoki '30'. */
export function renderSfx(cut = '67') {
  if (rendered.has(cut)) return rendered.get(cut)
  const [duration, score] = SCORES[cut]
  init(duration)
  score()

  // Reverb faqat o'rta-yuqori chastotalarga — past zarbalar «loyqa» bo'lmasin
  const hp = new Biquad('hp', 250)
  const wetIn = send.map((v) => hp.run(v))
  const wetL = reverb(wetIn, 0)
  const wetR = reverb(wetIn, 23)
  const wetGain = (0.35 * rms(send)) / rms(wetL)

  const L = new Float32Array(N)
  const R = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    L[i] = dryL[i] + wetL[i] * wetGain
    R[i] = dryR[i] + wetR[i] * wetGain
  }
  const result = { L, R }
  rendered.set(cut, result)
  return result
}

/** Faqat effektlar — montaj uchun alohida dorojka (cho'qqi −3 dBFS). */
export function buildSfx(cut = '67', file = join(out, cut === '30' ? 'savdogo-30s-sfx.wav' : 'savdogo-sfx.wav')) {
  const { L, R } = renderSfx(cut)
  return writeWav(file, L, R)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const cut of ['67', '30']) console.log(`  ✅ ${buildSfx(cut).split(/[\\/]/).pop()}`)
}
