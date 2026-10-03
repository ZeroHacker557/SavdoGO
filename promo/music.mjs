/**
 * Fon musiqasi — kod bilan sintez qilinadi (tashqi fayl yo'q, litsenziya
 * muammosi yo'q). 120 BPM, C major, akkordlar C – G – Am – F.
 *
 * Tuzilish videoning sahnalariga bog'langan (taktlar 1.4 + 2k soniyada,
 * shunda «5 daqiqada» zarbasi 9.4 s da aynan takt boshiga tushadi):
 *   0 – 5.4     kirish: pad, yumshoq arpedjio
 *   5.4 – 9.4   muammo: qorong'iroq, pulsatsiyali bas, ko'tariluvchi shovqin
 *   9.4         «SavdoGO bilan — 5 daqiqada»: to'liq ritm kiradi
 *   17.4        melodiya qo'shiladi; 33.4 (admin) — arpedjio oktava yuqori
 *   49.4        «10 kun bepul»: ritm to'xtaydi, 51.4 da sovg'a bilan qaytadi
 *   59.4        yakun oldidan baraban «roll»i, 61.4 — final, 65.4 — so'nish
 *
 * 30 soniyalik versiya (SHORT) — o'sha asboblar, taktlar 0 dan:
 *   0 – 2       savol: pulsatsiyali bas, ko'tariluvchi shovqin
 *   2           SavdoGO: ritm kiradi; 8 — melodiya; 16 — admin
 *   18 – 20     baraban «roll»i → 20 «10 kun bepul»; 26 — yakun, 28 — so'nish
 *
 *   node promo/music.mjs     # promo/out/savdogo-musiqa.wav va savdogo-30s-musiqa.wav
 */
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Biquad, SR, midiHz, reverb, rms, rng, writeWav } from './audio.mjs'
import { DURATION as LONG_DURATION } from './timeline.ts'
import { DURATION as SHORT_DURATION } from './short-timeline.ts'

const out = join(dirname(fileURLToPath(import.meta.url)), 'out')

const BEAT = 0.5

/* ── Garmoniya va bo'limlar ───────────────────────────────── */

const CHORDS = {
  C: { root: 36, tones: [60, 64, 67, 71] },
  G: { root: 43, tones: [59, 62, 67, 69] },
  Am: { root: 45, tones: [57, 60, 64, 67] },
  F: { root: 41, tones: [57, 60, 64, 69] },
}
const PROG = ['C', 'G', 'Am', 'F']

/** Melodiya: [8-lik o'rni, MIDI, uzunligi 8-liklarda] — har akkord uchun bir takt. */
const MELODY = {
  C: [[0, 76, 2], [2, 79, 2], [4, 81, 1], [5, 79, 1], [6, 76, 2]],
  G: [[0, 74, 2], [2, 79, 2], [4, 74, 1], [5, 76, 1], [6, 74, 2]],
  Am: [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 81, 2]],
  F: [[0, 81, 3], [3, 79, 1], [4, 76, 2], [6, 74, 2]],
}

const GROOVE = new Set(['A', 'B', 'C', 'P'])
const MELODIC = new Set(['B', 'P'])

/**
 * Aranjirovka: taktlar (barAt — k-takt boshi, soniya), bo'limlar,
 * akkordlar, «fill»lar, tarelka zarbalari va ko'tariluvchi shovqinlar.
 * preDrop — yarmi F, yarmi G bo'lgan takt (tushishdan oldin qisqa jimlik).
 */
const longBar = (k) => 1.4 + k * 2
const LONG_FIXED = { '-1': 'F', 0: 'C', 1: 'G', 2: 'Am', 3: 'F', 24: 'G', 29: 'G', 30: 'C', 31: 'F', 32: 'C' }
const LONG = {
  duration: LONG_DURATION,
  barAt: longBar,
  bars: [-1, 32],
  section(k) {
    if (k <= 1) return 'intro'
    if (k <= 3) return 'problem'
    if (k <= 7) return 'A'
    if (k <= 15) return 'B'
    if (k <= 19) return 'C'
    if (k <= 23) return 'B'
    if (k === 24) return 'break'
    if (k <= 28) return 'P'
    if (k === 29) return 'roll'
    if (k <= 31) return 'P'
    return 'outro'
  },
  chordOf: (k) => LONG_FIXED[k] ?? (k >= 25 ? PROG[(k - 25) % 4] : PROG[(k - 4) % 4]),
  preDrop: 3,
  fills: [7, 15, 19, 23, 28],
  crashes: [4, 8, 16, 20, 25, 30, 32],
  risers: [[7.4, 1.9, 0.16], [longBar(24), 1.9, 0.15], [longBar(29), 1.95, 0.17]],
}

const SHORT_FIXED = { 0: 'F', 9: 'G', 14: 'C' }
const SHORT = {
  duration: SHORT_DURATION,
  barAt: (k) => k * 2,
  bars: [0, 14],
  section(k) {
    if (k === 0) return 'problem'
    if (k <= 3) return 'A'
    if (k <= 7) return 'B'
    if (k === 8) return 'C'
    if (k === 9) return 'roll'
    if (k <= 13) return 'P'
    return 'outro'
  },
  chordOf: (k) => SHORT_FIXED[k] ?? (k >= 10 ? PROG[(k - 10) % 4] : PROG[(k - 1) % 4]),
  preDrop: 0,
  fills: [3, 7, 12],
  crashes: [1, 4, 8, 10, 13, 14],
  risers: [[0.15, 1.85, 0.16], [18, 1.95, 0.17]],
}

/** '67' — to'liq reklama, '30' — tezkor versiya. */
export const ARRANGEMENTS = { 67: LONG, 30: SHORT }

/* ── Asboblar ─────────────────────────────────────────────── */

const seconds = (s) => new Float32Array(Math.max(1, Math.round(s * SR)))
let seed = 1
const noiseGen = () => {
  const r = rng(seed++ * 6151)
  return () => r() * 2 - 1
}

/** PolyBLEP arra to'lqini — yumshoq, «tishlarsiz». */
function saw(freq, len, { detune = 0, phase = 0 } = {}) {
  const buf = seconds(len)
  const dt = (freq * Math.pow(2, detune / 1200)) / SR
  let p = phase
  for (let i = 0; i < buf.length; i++) {
    let v = 2 * p - 1
    if (p < dt) {
      const x = p / dt
      v -= x + x - x * x - 1
    } else if (p > 1 - dt) {
      const x = (p - 1) / dt
      v -= x * x + x + x + 1
    }
    buf[i] = v
    p += dt
    if (p >= 1) p -= 1
  }
  return buf
}

/** Pad: uchta biroz «sozlanmagan» arra, chap-o'ngga yoyilgan, filtrlangan. */
function padNote(midi, len, { attack = 0.3, release = 0.6, cutoff = () => 2000 } = {}) {
  const f = midiHz(midi)
  const total = len + release
  const L = saw(f, total, { detune: -8, phase: 0.1 })
  const R = saw(f, total, { detune: 8, phase: 0.6 })
  const C = saw(f, total, { detune: 0, phase: 0.35 })
  const lpL = new Biquad('lp', 2000, 0.6)
  const lpR = new Biquad('lp', 2000, 0.6)
  for (let i = 0; i < L.length; i++) {
    const t = i / SR
    if (i % 32 === 0) {
      const c = cutoff(t)
      lpL.set(c)
      lpR.set(c)
    }
    const a = Math.min(1, t / attack) * (t > len ? Math.max(0, 1 - (t - len) / release) : 1)
    L[i] = lpL.run(L[i] + C[i] * 0.6) * a
    R[i] = lpR.run(R[i] + C[i] * 0.6) * a
  }
  return [L, R]
}

function bassNote(midi, len, cutoff = 700) {
  const f = midiHz(midi)
  const s = saw(f, len + 0.04)
  const lp = new Biquad('lp', cutoff, 0.9)
  for (let i = 0; i < s.length; i++) {
    const t = i / SR
    const a = Math.min(1, t / 0.004) * (t > len ? Math.max(0, 1 - (t - len) / 0.04) : 1) * (0.75 + 0.25 * Math.exp(-t / 0.08))
    s[i] = (lp.run(s[i]) * 0.75 + Math.sin(2 * Math.PI * f * t) * 0.6) * a
  }
  return s
}

/** Arpedjio uchun «pluck»: filtr tez yopiladi. */
function pluck(midi, len = 0.24) {
  const s = saw(midiHz(midi), len)
  const lp = new Biquad('lp', 4000, 0.8)
  for (let i = 0; i < s.length; i++) {
    const t = i / SR
    if (i % 16 === 0) lp.set(700 + 3800 * Math.exp(-t / 0.05))
    s[i] = lp.run(s[i]) * Math.min(1, t / 0.002) * Math.exp(-t / 0.11)
  }
  return s
}

/** Melodiya — qo'ng'iroqsimon, yumshoq. */
function bellNote(midi, len) {
  const f = midiHz(midi)
  const buf = seconds(len + 0.7)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    const w = 2 * Math.PI * f * t
    const tone = Math.sin(w) + Math.sin(2 * w) * 0.32 + Math.sin(3 * w) * 0.12 + Math.sin(4.01 * w) * 0.06
    const a = Math.min(1, t / 0.006) * Math.exp(-t / 0.45) * (t > len ? Math.exp(-(t - len) / 0.15) : 1)
    buf[i] = tone * a
  }
  return buf
}

function kick(gain = 1) {
  const buf = seconds(0.45)
  const noise = noiseGen()
  let phase = 0
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    phase += (2 * Math.PI * (46 + 115 * Math.exp(-t / 0.035))) / SR
    buf[i] = (Math.sin(phase) * Math.exp(-t / 0.28) + noise() * Math.exp(-t / 0.002) * 0.3) * gain
  }
  return buf
}

function clap() {
  const buf = seconds(0.35)
  const noise = noiseGen()
  const bp = new Biquad('bp', 1300, 0.9)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    // uch qisqa «chapak» + dum
    let env = 0
    for (const at of [0, 0.011, 0.022]) if (t >= at) env = Math.max(env, Math.exp(-(t - at) / 0.006))
    if (t > 0.022) env = Math.max(env, 0.55 * Math.exp(-(t - 0.022) / 0.11))
    buf[i] = bp.run(noise()) * env * 2.5 + Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t / 0.03) * 0.3
  }
  return buf
}

function hat(open = false) {
  const buf = seconds(open ? 0.4 : 0.08)
  const noise = noiseGen()
  const hp = new Biquad('hp', 7500, 0.7)
  for (let i = 0; i < buf.length; i++) buf[i] = hp.run(noise()) * Math.exp(-i / SR / (open ? 0.2 : 0.032))
  return buf
}

function snare() {
  const buf = seconds(0.22)
  const noise = noiseGen()
  const bp = new Biquad('bp', 1900, 0.7)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    buf[i] = bp.run(noise()) * Math.exp(-t / 0.08) * 1.6 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.04) * 0.6
  }
  return buf
}

function crash() {
  const buf = seconds(2.4)
  const noise = noiseGen()
  const hp = new Biquad('hp', 4200, 0.6)
  const bp = new Biquad('bp', 8500, 1.2)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    const n = noise()
    buf[i] = (hp.run(n) * 0.7 + bp.run(n) * 0.8) * Math.exp(-t / 0.9) * Math.min(1, t / 0.002)
  }
  return buf
}

/** Ko'tariluvchi shovqin — keyingi bo'limga «olib chiqadi». */
function riser(len) {
  const L = seconds(len)
  const R = seconds(len)
  const nl = noiseGen()
  const nr = noiseGen()
  const bl = new Biquad('bp', 400, 1.1)
  const br = new Biquad('bp', 400, 1.1)
  let phase = 0
  for (let i = 0; i < L.length; i++) {
    const x = i / L.length
    if (i % 16 === 0) {
      const c = 400 * Math.pow(20, x)
      bl.set(c)
      br.set(c)
    }
    phase += (2 * Math.PI * 220 * Math.pow(4, x)) / SR
    const env = Math.pow(x, 2.2)
    const tone = Math.sin(phase) * 0.12
    L[i] = (bl.run(nl()) * 1.4 + tone) * env
    R[i] = (br.run(nr()) * 1.4 + tone) * env
  }
  return [L, R]
}

/* ── Miks shinalari ───────────────────────────────────────── */

let N = 0
let drums, ducked, arpBus, lead, send, duck

/** Shinalarni yangi uzunlikka tayyorlaydi; tasodif ham boshidan — natija har safar bir xil. */
function init(duration) {
  N = Math.ceil(duration * SR)
  const stereo = () => [new Float32Array(N), new Float32Array(N)]
  drums = stereo()
  ducked = stereo() // pad, bas, arpedjio — kick bilan «nafas oladi»
  arpBus = stereo()
  lead = stereo()
  send = new Float32Array(N)
  duck = new Float32Array(N).fill(1)
  seed = 1
}

/** Signalni shinaga qo'yadi: mono (pan bilan) yoki [L, R]. */
function add(bus, t, sig, { gain = 1, pan = 0, rev = 0 } = {}) {
  const start = Math.round(t * SR)
  const stereo = Array.isArray(sig)
  const len = stereo ? sig[0].length : sig.length
  const angle = ((pan + 1) * Math.PI) / 4
  const gl = Math.cos(angle) * gain
  const gr = Math.sin(angle) * gain
  for (let i = 0; i < len; i++) {
    const j = start + i
    if (j < 0 || j >= N) continue
    const l = stereo ? sig[0][i] * gain : sig[i] * gl
    const r = stereo ? sig[1][i] * gain : sig[i] * gr
    bus[0][j] += l
    bus[1][j] += r
    if (rev) send[j] += (l + r) * 0.5 * rev
  }
}

function kickAt(t, gain = 1) {
  add(drums, t, kick(), { gain: 0.72 * gain })
  // Sidechain: kick urilganda pad va bas bir lahza pasayadi
  const start = Math.round(t * SR)
  for (let i = 0; i < 0.35 * SR; i++) {
    const j = start + i
    if (j < 0 || j >= N) continue
    const s = i / SR
    const dip = 1 - 0.55 * gain * Math.exp(-s / 0.09) * Math.min(1, s / 0.004)
    duck[j] = Math.min(duck[j], dip)
  }
}

/* ── Aranjirovka ──────────────────────────────────────────── */

function arrange(spec) {
  for (let k = spec.bars[0]; k <= spec.bars[1]; k++) {
    const t0 = spec.barAt(k)
    const sec = spec.section(k)
    const segments = k === spec.preDrop ? [[t0, 1, 'F', 0.6], [t0 + 1, 0.85, 'G', 0.08]] : [[t0, sec === 'outro' ? 1.9 : 2, spec.chordOf(k), sec === 'outro' ? 0.1 : 0.6]]

    for (const [t, len, name, release] of segments) {
      const chord = CHORDS[name]

      // Pad
      const cutoff =
        sec === 'intro' ? () => 1100
          : sec === 'problem' ? () => 800
            : sec === 'break' ? (s) => 700 * Math.pow(4.5, Math.min(1, s / len))
              : sec === 'roll' ? (s) => 900 * Math.pow(4, Math.min(1, s / len))
                : () => 2100
      const attack = sec === 'intro' ? 1.4 : sec === 'break' || sec === 'roll' ? 0.5 : 0.08
      const padGain = GROOVE.has(sec) ? 0.075 : 0.1
      chord.tones.forEach((m, i) => {
        add(ducked, t, padNote(m, len, { attack, release, cutoff }), { gain: padGain, rev: 0.5 })
        // Final akkord — oktava yuqorisi ham, kengroq
        if (sec === 'outro') add(ducked, t, padNote(m + 12, len, { attack: 0.05, release: 0.1, cutoff: () => 2600 }), { gain: 0.035, pan: i % 2 ? 0.4 : -0.4, rev: 0.6 })
      })

      // Bas
      if (sec === 'problem') {
        for (let e = 0; (e * BEAT) / 2 < len - 0.1; e++) add(ducked, t + (e * BEAT) / 2, bassNote(chord.root, 0.2, 260), { gain: 0.32 })
      } else if (GROOVE.has(sec)) {
        ;[1, 3, 5, 7].forEach((e) => add(ducked, t + (e * BEAT) / 2, bassNote(chord.root + (e === 7 ? 12 : 0), 0.21, 650), { gain: 0.34 }))
      } else if (sec === 'break') {
        add(ducked, t, bassNote(chord.root, len, 220), { gain: 0.28 })
      } else if (sec === 'roll') {
        for (let e = 0; e < 8; e++) add(ducked, t + (e * BEAT) / 2, bassNote(chord.root, 0.2, 300 + e * 120), { gain: 0.3 })
      } else if (sec === 'outro') {
        add(ducked, t, bassNote(chord.root, 1.6, 400), { gain: 0.34 })
      }

      // Arpedjio
      const seq = [0, 1, 2, 3].map((i) => chord.tones[i]).concat([chord.tones[0] + 12, chord.tones[3], chord.tones[2], chord.tones[1]])
      const sixteenths = GROOVE.has(sec) || sec === 'roll'
      const arpOn = sec === 'intro' ? k >= 0 : sec !== 'problem' && sec !== 'outro'
      if (arpOn) {
        const step = sixteenths ? BEAT / 4 : BEAT / 2
        const up = sec === 'C' ? 12 : 0
        for (let n = 0; n * step < len - 0.01; n++) {
          const accent = n % 4 === 0 ? 1 : 0.7
          add(arpBus, t + n * step, pluck(seq[n % 8] + up), { gain: (sec === 'intro' ? 0.07 : 0.085) * accent, pan: n % 2 ? 0.35 : -0.35, rev: 0.25 })
        }
      }

      // Melodiya
      if (MELODIC.has(sec)) {
        for (const [pos, m, l] of MELODY[name]) add(lead, t + (pos * BEAT) / 2, bellNote(m, (l * BEAT) / 2), { gain: 0.16, pan: 0.1, rev: 0.4 })
      }
    }

    // Baraban
    if (GROOVE.has(sec)) {
      for (let b = 0; b < 4; b++) kickAt(t0 + b * BEAT)
      ;[1, 3].forEach((b) => add(drums, t0 + b * BEAT, clap(), { gain: 0.27, rev: 0.25 }))
      for (let n = 0; n < 16; n++) {
        const at = t0 + (n * BEAT) / 4
        const offbeat8 = n % 4 === 2
        if (sec === 'A') {
          if (n % 2 === 0 && n % 4 !== 0) add(drums, at, hat(), { gain: 0.11, pan: 0.25 })
        } else if (sec === 'P' && offbeat8) {
          add(drums, at, hat(true), { gain: 0.08, pan: 0.25 })
        } else {
          add(drums, at, hat(), { gain: [0.06, 0.035, 0.1, 0.035][n % 4], pan: 0.25 })
        }
      }
      // Bo'lim oxirida kichik «fill»
      if (spec.fills.includes(k)) for (let n = 0; n < 4; n++) add(drums, t0 + 1.5 + (n * BEAT) / 4, snare(), { gain: 0.12 + n * 0.05, pan: -0.15 + n * 0.1, rev: 0.2 })
    }
    if (sec === 'problem') [0, 2].forEach((b) => kickAt(t0 + b * BEAT, 0.4))
    if (sec === 'roll') {
      for (let n = 0; n < 12; n++) add(drums, t0 + (n * BEAT) / 4, snare(), { gain: 0.08 + n * 0.025, rev: 0.25 })
      for (let n = 0; n < 8; n++) add(drums, t0 + 1.5 + (n * BEAT) / 8, snare(), { gain: 0.4 + n * 0.04, rev: 0.25 })
    }
    if (spec.crashes.includes(k)) add(drums, t0, crash(), { gain: k === spec.bars[1] ? 0.2 : 0.16, rev: 0.3 })
    if (sec === 'outro') {
      kickAt(t0)
      ;[72, 76, 79, 84].forEach((m, i) => add(lead, t0 + i * 0.12, bellNote(m, 1.2), { gain: 0.12, pan: -0.3 + i * 0.2, rev: 0.6 }))
    }
  }

  // Ko'tariluvchi shovqinlar — keyingi bo'limga «olib chiqadi»
  for (const [t, len, gain] of spec.risers) add(drums, t, riser(len), { gain, rev: 0.3 })
}

/** Arpedjio uchun «ping-pong» echo (nuqtali sakkizlik). */
function pingPong([L, R], delay = 0.375, feedback = 0.32, mix = 0.3) {
  const d = Math.round(delay * SR)
  const outL = new Float32Array(N)
  const outR = new Float32Array(N)
  const echoL = new Float32Array(N)
  const echoR = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const inL = i >= d ? L[i - d] * 0.5 + R[i - d] * 0.5 : 0
    echoL[i] = inL + (i >= d ? echoR[i - d] * feedback : 0)
    echoR[i] = i >= d ? echoL[i - d] * feedback : 0
    outL[i] = L[i] + echoL[i] * mix
    outR[i] = R[i] + echoR[i] * mix
  }
  return [outL, outR]
}

const rendered = new Map()

/** Musiqa (float, cheklanmagan) — effektlar bilan miks qilish uchun. cut: '67' yoki '30'. */
export function renderMusic(cut = '67') {
  if (rendered.has(cut)) return rendered.get(cut)
  const spec = ARRANGEMENTS[cut]
  init(spec.duration)
  arrange(spec)

  const [arpL, arpR] = pingPong(arpBus)
  const hp = new Biquad('hp', 200)
  const wetIn = send.map((v) => hp.run(v))
  const wetL = reverb(wetIn, 0, { room: 0.86 })
  const wetR = reverb(wetIn, 23, { room: 0.86 })
  const wetGain = (0.45 * rms(send)) / rms(wetL)

  const L = new Float32Array(N)
  const R = new Float32Array(N)
  const hpL = new Biquad('hp', 28)
  const hpR = new Biquad('hp', 28)
  for (let i = 0; i < N; i++) {
    const dk = duck[i]
    L[i] = hpL.run(drums[0][i] + (ducked[0][i] + arpL[i]) * dk + lead[0][i] * (0.6 + 0.4 * dk) + wetL[i] * wetGain)
    R[i] = hpR.run(drums[1][i] + (ducked[1][i] + arpR[i]) * dk + lead[1][i] * (0.6 + 0.4 * dk) + wetR[i] * wetGain)
  }
  const result = { L, R }
  rendered.set(cut, result)
  return result
}

/** Faqat musiqa — montaj uchun alohida dorojka. */
export function buildMusic(cut = '67', file = join(out, cut === '30' ? 'savdogo-30s-musiqa.wav' : 'savdogo-musiqa.wav')) {
  const { L, R } = renderMusic(cut)
  return writeWav(file, L, R, { drive: 1.1, fadeOut: 0.6 })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const cut of ['67', '30']) console.log(`  ✅ ${buildMusic(cut).split(/[\\/]/).pop()}`)
}
