/**
 * Videoning to'liq ovozi: effektlar (sfx.mjs) + fon musiqasi (music.mjs).
 *
 *   node promo/soundtrack.mjs                    # 67 s — hamma tayyor videolarga
 *   node promo/soundtrack.mjs --only 9x16-toza
 *   node promo/soundtrack.mjs --short            # 30 s versiya videolariga
 *
 * promo/out/ ga uchta fayl yoziladi (30 s uchun nomlar savdogo-30s-...):
 *   savdogo-ovoz.wav    — miks (videolar ichidagi ovoz)
 *   savdogo-sfx.wav     — faqat effektlar  } montajda diktor ovozi bilan
 *   savdogo-musiqa.wav  — faqat musiqa     } alohida balanslash uchun
 *
 * Musiqa effektlardan ~3 dB, keyin qo'shiladigan diktordan esa ko'proq
 * past turadi — miksni montajda o'zgartirish oson.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { muxInto, peakOf, writeWav } from './audio.mjs'
import { buildMusic, renderMusic } from './music.mjs'
import { buildSfx, renderSfx } from './sfx.mjs'

const out = join(dirname(fileURLToPath(import.meta.url)), 'out')

/** Musiqaning effektlarga nisbatan darajasi (ikkalasi cho'qqi bo'yicha tenglashtirilgandan keyin). */
const MUSIC_GAIN = 0.4

/** cut ('67' | '30') versiyasining videolari. */
export const videosOf = (cut) =>
  ['subtitrli', 'toza', '9x16-subtitrli', '9x16-toza'].map((kind) => join(out, `savdogo-${cut === '30' ? '30s' : 'reklama'}-${kind}.mp4`))

export function buildSoundtrack(cut = '67') {
  buildSfx(cut)
  buildMusic(cut)
  const sfx = renderSfx(cut)
  const music = renderMusic(cut)
  const sp = peakOf(sfx.L, sfx.R)
  const mp = peakOf(music.L, music.R)
  const L = new Float32Array(sfx.L.length)
  const R = new Float32Array(sfx.R.length)
  for (let i = 0; i < L.length; i++) {
    L[i] = sfx.L[i] / sp + (music.L[i] / mp) * MUSIC_GAIN
    R[i] = sfx.R[i] / sp + (music.R[i] / mp) * MUSIC_GAIN
  }
  return writeWav(join(out, cut === '30' ? 'savdogo-30s-ovoz.wav' : 'savdogo-ovoz.wav'), L, R, { peak: 0.89, drive: 1.4, fadeOut: 0.6 })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const cut = args.includes('--short') ? '30' : '67'
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : ''
  const wav = buildSoundtrack(cut)
  console.log(`  ✅ ${wav.split(/[\\/]/).pop()} (effektlar + musiqa)`)
  for (const video of videosOf(cut)) {
    if ((only && !video.endsWith(`-${only}.mp4`)) || !existsSync(video)) continue
    muxInto(video, wav)
    console.log(`  ✅ ${video.split(/[\\/]/).pop()} — ovoz qo'shildi`)
  }
}
