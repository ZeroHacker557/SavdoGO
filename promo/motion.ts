/** Ikkala video (67 s va 30 s) uchun umumiy harakat yordamchilari. */
import type { CSSProperties } from 'react'

/** Kechikish (s) — `.a-*` animatsiya sinflari shu bilan ishlaydi. */
export const d = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

const CONFETTI_COLORS = ['#c6f432', '#8b5cf6', '#ec4899', '#ffffff', '#38bdf8', '#facc15']
/** Qutidan otilib chiqadigan qog'ozchalar — deterministik, har kadrda bir xil. */
export const CONFETTI = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => (Math.sin(i * 431 + n * 97) + 1) / 2
  const angle = -Math.PI / 2 + (r(1) - 0.5) * Math.PI * 1.5
  const dist = 330 + r(2) * 420
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 0.75 + 260 * r(3)),
    rot: Math.round((r(4) - 0.5) * 1080),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 12 + Math.round(r(5) * 14),
    delay: 1.18 + r(6) * 0.12,
  }
})
