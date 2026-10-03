/**
 * Ovoz uchun umumiy asboblar — sfx.mjs (effektlar) va music.mjs (fon
 * musiqasi) ishlatadi: tasodif, filtr, reverb, WAV yozish, videoga qo'shish.
 */
import { spawnSync } from 'node:child_process'
import { renameSync, writeFileSync } from 'node:fs'

export const SR = 48_000

/** Deterministik tasodif — har safar bir xil ovoz chiqadi. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** RBJ biquad filtr: lp / hp / bp. Chastotani vaqt bo'yicha `set()` bilan o'zgartirsa bo'ladi. */
export class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type
    this.x1 = this.x2 = this.y1 = this.y2 = 0
    this.set(freq, q)
  }
  set(freq, q = this.q) {
    this.q = q
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    let b0, b1, b2
    if (this.type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
    else if (this.type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
    else [b0, b1, b2] = [alpha, 0, -alpha]
    const a0 = 1 + alpha
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = (-2 * cos) / a0
    this.a2 = (1 - alpha) / a0
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

/** MIDI nota → Hz (69 = A4 = 440). */
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

export const rms = (buf) => Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length) || 1

export function peakOf(...bufs) {
  let max = 0
  for (const buf of bufs) for (const v of buf) max = Math.max(max, Math.abs(v))
  return max || 1
}

/** Freeverb (soddalashtirilgan) — tovushlarga «xona» beradi. */
export function reverb(input, spread, { room = 0.82, damp = 0.25 } = {}) {
  const k = SR / 44100
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0, f: 0 }))
  const passes = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0 }))
  const result = new Float32Array(input.length)
  for (let n = 0; n < input.length; n++) {
    const x = input[n] * 0.015
    let y = 0
    for (const c of combs) {
      const o = c.buf[c.i]
      c.f = o * (1 - damp) + c.f * damp
      c.buf[c.i] = x + c.f * room
      c.i = (c.i + 1) % c.buf.length
      y += o
    }
    for (const a of passes) {
      const b = a.buf[a.i]
      a.buf[a.i] = y + b * 0.5
      a.i = (a.i + 1) % a.buf.length
      y = b - y
    }
    result[n] = y
  }
  return result
}

/**
 * 16-bit stereo WAV: yumshoq cheklash (tanh), cho'qqi `peak` ga
 * keltiriladi, oxirida `fadeOut` soniyada so'nadi.
 */
export function writeWav(file, L, R, { peak = 0.708, drive = 1.3, fadeOut = 0.4 } = {}) {
  const n = L.length
  const top = peakOf(L, R)
  const fadeFrom = n - Math.round(fadeOut * SR)
  const pcm = Buffer.alloc(n * 4)
  const shape = (v, fade) => (Math.tanh((drive * v) / top) / Math.tanh(drive)) * peak * fade
  for (let i = 0; i < n; i++) {
    const fade = i > fadeFrom ? 1 - (i - fadeFrom) / (n - fadeFrom) : 1
    pcm.writeInt16LE(Math.round(shape(L[i], fade) * 32767), i * 4)
    pcm.writeInt16LE(Math.round(shape(R[i], fade) * 32767), i * 4 + 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(2, 22)
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 4, 28)
  header.writeUInt16LE(4, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  writeFileSync(file, Buffer.concat([header, pcm]))
  return file
}

/** Videoga ovozni qo'shadi (video qayta kodlanmaydi, eski ovoz almashtiriladi). */
export function muxInto(video, wav) {
  const tmp = video.replace(/\.mp4$/, '.ovoz.mp4')
  const result = spawnSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', video, '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp,
  ], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`ffmpeg: ${video} ga ovoz qo'shilmadi`)
  renameSync(tmp, video)
}
