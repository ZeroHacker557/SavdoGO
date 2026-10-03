import { createRoot } from 'react-dom/client'
import { Promo } from './Promo'
import { Short } from './Short'
import * as long from './timeline'
import * as short from './short-timeline'
import './promo.css'
import './short.css'

/**
 * Video — oddiy veb-sahifa, lekin vaqt QO'LDA boshqariladi: barcha CSS
 * animatsiyalar to'xtatilgan va `seek(t)` ularni aynan t-soniyaga
 * qo'yadi. Shunday qilib render.mjs har kadrni aniq vaqtda suratga
 * oladi — video 60 kadr/s da sakrashsiz, silliq chiqadi.
 *
 *   /promo/            — ko'rish (real vaqtda aylanadi)
 *   /promo/?t=20       — 20-soniyadan
 *   /promo/?render     — render.mjs uchun (o'zi o'ynamaydi)
 *   &subs=0            — subtitrsiz
 *   &v                 — 9:16 vertikal (1080×1920)
 *   &cut=30            — 30 soniyalik tezkor versiya (Short.tsx)
 */
const params = new URLSearchParams(location.search)
const rendering = params.has('render')
const subtitles = params.get('subs') !== '0'
const vertical = params.has('v')
const [W, H] = vertical ? [1080, 1920] : [1920, 1080]
const cut30 = params.get('cut') === '30'
const { DURATION, SUBTITLES } = cut30 ? short : long

const host = document.getElementById('promo-root') as HTMLElement
createRoot(host).render(cut30 ? <Short subtitles={subtitles} vertical={vertical} /> : <Promo subtitles={subtitles} vertical={vertical} />)

function sceneStart(el: Element | null): number {
  const scene = el?.closest('[data-start]') as HTMLElement | null
  return scene ? Number(scene.dataset.start) : 0
}

function format(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3)

function seek(t: number) {
  // Sahna va subtitrlar — faqat o'z vaqtida ko'rinadi (qolganlari chizilmaydi)
  for (const el of document.querySelectorAll<HTMLElement>('[data-start]')) {
    const start = Number(el.dataset.start)
    const len = Number(el.dataset.len)
    el.style.visibility = t >= start - 0.02 && t <= start + len + 0.02 ? 'visible' : 'hidden'
  }
  // Har animatsiya — o'z sahnasining boshidan hisoblanadi
  for (const anim of document.getAnimations()) {
    const target = (anim.effect as KeyframeEffect | null)?.target ?? null
    anim.pause()
    anim.currentTime = Math.max(0, (t - sceneStart(target)) * 1000)
  }
  // Sanab boruvchi raqamlar: data-count (oxirgi qiymat), data-at, data-dur
  for (const el of document.querySelectorAll<HTMLElement>('[data-count]')) {
    const local = t - sceneStart(el) - Number(el.dataset.at || 0)
    const p = Math.min(1, Math.max(0, local / Number(el.dataset.dur || 1)))
    el.textContent = format(Number(el.dataset.count) * ease(p))
  }
}

/** Shriftlar va rasmlar yuklanguncha kutadi — birinchi kadrlar bo'sh chiqmasin. */
async function ready() {
  await document.fonts.ready
  // Banner fonlari <img> emas (background-image) — ularni ham oldindan yuklaymiz
  const backgrounds = [...document.querySelectorAll<HTMLElement>('.sp-hero')]
    .map((el) => /url\(["']?(.*?)["']?\)/.exec(el.style.backgroundImage)?.[1])
    .filter((url): url is string => Boolean(url))
  await Promise.all(backgrounds.map((src) => new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = resolve
    img.src = src
  })))
  for (let i = 0; i < 100; i++) {
    const images = [...document.images]
    if (images.length && images.every((img) => img.complete)) break
    await new Promise((r) => setTimeout(r, 150))
  }
  await new Promise((r) => setTimeout(r, 300))
}

declare global {
  interface Window {
    __promo: { duration: number; subtitles: typeof SUBTITLES; seek: (t: number) => void; ready: () => Promise<void> }
  }
}
window.__promo = { duration: DURATION, subtitles: SUBTITLES, seek, ready }

if (!rendering) {
  // Ko'rish rejimi: ekranga sig'adigan qilib kichraytiriladi va real vaqtda aylanadi
  const fit = () => host.style.setProperty('--fit', String(Math.min(innerWidth / W, innerHeight / H)))
  fit()
  addEventListener('resize', fit)
  document.documentElement.classList.add('pv-preview')
  const from = Number(params.get('t') || 0)
  const t0 = performance.now() - from * 1000
  const loop = () => {
    seek(((performance.now() - t0) / 1000) % DURATION)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
