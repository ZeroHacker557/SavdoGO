/**
 * Instagram rasmlarini chizadi: sahifani headless Chrome bilan suratga
 * oladi; karusel bo'lsa ffmpeg bilan 1080×1350 bo'laklarga bo'ladi.
 *
 * Talab: dev server ishlab tursin (http://localhost:5173), Chrome va ffmpeg.
 *   node promo/carousel.mjs              # karusel: 4 ta rasm (carousel.html)
 *   node promo/carousel.mjs first-post   # birinchi post: 1 ta rasm (first-post.html)
 *
 * Natija: promo/out/instagram/. Chrome vaqtinchalik profili ham promo/out
 * ichida (C: diskni to'ldirmasin; vite.config.ts uni kuzatmaydi).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PAGES = {
  carousel: { path: 'carousel.html', size: [4320, 1350], file: 'savdogo-karusel-butun.png', split: 4, part: 'savdogo-karusel' },
  'first-post': { path: 'first-post.html', size: [1080, 1350], file: 'savdogo-birinchi-post.png', split: 0 },
}

const name = process.argv[2] || 'carousel'
const page = PAGES[name]
if (!page) throw new Error(`Noma'lum sahifa: ${name} (bor: ${Object.keys(PAGES).join(', ')})`)

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out', 'instagram')
mkdirSync(out, { recursive: true })

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p))
if (!CHROME) throw new Error('Google Chrome topilmadi')

const full = join(out, page.file)
const profile = join(here, 'out', '.chrome-carousel')

try {
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${page.size.join(',')}`,
    // Shriftlar va mahsulot rasmlari yuklanishiga vaqt
    '--virtual-time-budget=12000',
    `--user-data-dir=${profile}`,
    `--screenshot=${full}`,
    `http://localhost:5173/promo/${page.path}`,
  ], { stdio: 'ignore' })
} finally {
  rmSync(profile, { recursive: true, force: true })
}
if (!existsSync(full)) throw new Error('Rasm chizilmadi — dev server ishlayaptimi (http://localhost:5173)?')

for (let i = 0; i < page.split; i++) {
  const file = join(out, `${page.part}-${i + 1}.png`)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-vf', `crop=1080:1350:${i * 1080}:0`, file])
  console.log(`  ✅ ${file}`)
}
console.log(`  ✅ ${full}`)
