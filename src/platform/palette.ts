import { FONT_PAIRS, type FontPairId } from './business-types'

/**
 * Bitta brend rangidan to'liq dizayn palitrasi.
 *
 * Do'kon egasi formada ikkita rang tanlaydi — asosiy va aksent. Ilova
 * esa styles.css dagi 40 ga yaqin tokenni ishlatadi (fon, yuza,
 * chegaralar, tus, soya...). Shu tokenlarning hammasi shu yerda
 * tanlangan rangdan hisoblanadi — yorug' va qorong'i rejim uchun
 * alohida, matn o'qilishi (kontrast) tekshirilgan holda.
 *
 * Natija `<style id="shop-theme">` bo'lib styles.css dan KEYIN
 * qo'yiladi: selektorlar bir xil, shuning uchun keyingisi yutadi.
 */

export type ShopTheme = {
  brand: string
  accent: string
  font: FontPairId
}

type Rgb = [number, number, number]

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
}

function toRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as Rgb
}

function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

/** a va b orasida: t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

function channel(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG nisbiy yorug'lik. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Rang fon bo'lganda ustidagi matn: oq yoki deyarli qora — qaysi biri o'qilsa. */
export function inkOn(hex: string): string {
  return contrast(hex, '#ffffff') >= contrast(hex, '#111111') ? '#ffffff' : '#111111'
}

/**
 * `target` fon ustida kamida `ratio` kontrastga yetguncha rangni
 * to'qlashtiradi yoki ochadi. Sariq kabi och ranglar oq fonda matn
 * bo'lib o'qilmaydi — ular uchun to'qroq nusxa kerak.
 */
export function ensureContrast(color: string, target: string, ratio: number): string {
  if (contrast(color, target) >= ratio) return color
  const towards = luminance(target) > 0.5 ? '#000000' : '#ffffff'
  for (let t = 0.05; t <= 1; t += 0.05) {
    const candidate = mix(color, towards, t)
    if (contrast(candidate, target) >= ratio) return candidate
  }
  return towards
}

function alpha(hex: string, a: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgb(${r} ${g} ${b} / ${a})`
}

export type ThemeTokens = Record<string, string>

export function lightTokens(theme: ShopTheme): ThemeTokens {
  const base = isHexColor(theme.brand) ? theme.brand : '#4F46E5'
  const accentRaw = isHexColor(theme.accent) ? theme.accent : '#F59E0B'

  // Tugma foni — ustidagi matn o'qilishi uchun juda och bo'lmasin
  const brand = ensureContrast(base, '#ffffff', 3)
  // Matn sifatida ishlatiladigan brend rangi (havola, narx) — 4.5
  const brandText = ensureContrast(base, '#ffffff', 4.5)
  const neutralBase = mix('#f5f6f8', base, 0.05)

  return {
    '--bg': neutralBase,
    '--surface': '#ffffff',
    '--surface-2': mix('#fafbfc', base, 0.025),
    '--surface-3': mix('#f0f2f5', base, 0.06),

    '--ink': mix('#101318', base, 0.08),
    '--ink-2': mix('#2c323b', base, 0.08),
    '--muted': mix('#5d6673', base, 0.1),
    '--faint': mix('#8a929e', base, 0.1),

    '--line': mix('#e6e9ee', base, 0.07),
    '--line-soft': mix('#f1f3f6', base, 0.05),

    '--brand': brand,
    '--brand-strong': mix(brandText, '#000000', 0.12),
    '--brand-ink': inkOn(brand),
    '--brand-soft': mix(base, '#ffffff', 0.9),
    '--brand-soft-2': mix(base, '#ffffff', 0.8),
    '--brand-line': mix(base, '#ffffff', 0.62),

    // Aksent — chegirma nishonlari, kategoriya chiplari
    '--gold': ensureContrast(accentRaw, '#ffffff', 3.2),
    '--gold-strong': ensureContrast(accentRaw, '#ffffff', 4.8),
    '--gold-bright': accentRaw,
    '--gold-soft': mix(accentRaw, '#ffffff', 0.88),
    '--gold-line': mix(accentRaw, '#ffffff', 0.6),

    '--pill-1': mix(accentRaw, '#ffffff', 0.55),
    '--pill-2': mix(accentRaw, '#ffffff', 0.35),
    '--pill-ink': ensureContrast(mix(accentRaw, '#000000', 0.55), mix(accentRaw, '#ffffff', 0.45), 5),

    // Uchinchi rang — asosiy rangning to'q nusxasi
    '--royal': mix(brandText, '#000000', 0.25),
    '--royal-strong': mix(brandText, '#000000', 0.4),
    '--royal-ink': '#ffffff',
    '--royal-soft': mix(base, '#ffffff', 0.9),
    '--royal-line': mix(base, '#ffffff', 0.7),

    '--tint-top': mix(base, '#ffffff', 0.74),
    '--tint-mid': mix(base, '#ffffff', 0.86),

    '--shadow-brand': `0 6px 20px ${alpha(brand, 0.28)}`,
  }
}

export function darkTokens(theme: ShopTheme): ThemeTokens {
  const base = isHexColor(theme.brand) ? theme.brand : '#4F46E5'
  const accentRaw = isHexColor(theme.accent) ? theme.accent : '#F59E0B'
  const bg = mix('#0b0d10', base, 0.05)
  const surface = mix('#13161b', base, 0.06)
  // Qorong'i fonda brend rangi ochroq bo'lishi kerak
  const brand = ensureContrast(base, surface, 4.5)

  return {
    '--bg': bg,
    '--surface': surface,
    '--surface-2': mix('#1a1e24', base, 0.07),
    '--surface-3': mix('#222730', base, 0.08),

    '--ink': mix('#eef0f3', base, 0.04),
    '--ink-2': mix('#c9ced6', base, 0.05),
    '--muted': mix('#939aa6', base, 0.06),
    '--faint': mix('#737b88', base, 0.06),

    '--line': mix('#262b33', base, 0.08),
    '--line-soft': mix('#1c2027', base, 0.06),

    '--brand': brand,
    '--brand-strong': mix(brand, '#ffffff', 0.12),
    '--brand-ink': inkOn(brand),
    '--brand-soft': mix(surface, base, 0.18),
    '--brand-soft-2': mix(surface, base, 0.26),
    '--brand-line': mix(surface, base, 0.38),

    '--gold': ensureContrast(accentRaw, surface, 4.5),
    '--gold-strong': ensureContrast(accentRaw, surface, 5.5),
    '--gold-bright': accentRaw,
    '--gold-soft': mix(surface, accentRaw, 0.14),
    '--gold-line': mix(surface, accentRaw, 0.3),

    '--pill-1': mix(accentRaw, '#000000', 0.08),
    '--pill-2': mix(accentRaw, '#000000', 0.18),
    '--pill-ink': inkOn(accentRaw),

    '--royal': mix(brand, '#ffffff', 0.25),
    '--royal-strong': mix(brand, '#ffffff', 0.1),
    '--royal-ink': inkOn(mix(brand, '#ffffff', 0.25)),
    '--royal-soft': mix(surface, base, 0.16),
    '--royal-line': mix(surface, base, 0.32),

    '--tint-top': 'transparent',
    '--tint-mid': 'transparent',

    '--shadow-brand': '0 6px 20px rgb(0 0 0 / 0.5)',
  }
}

function block(selector: string, tokens: ThemeTokens, extra = ''): string {
  const body = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  return `${selector} {\n${body}\n${extra}}\n`
}

/** Tayyor CSS matni — `<style>` ichiga qo'yiladi. */
export function themeCss(theme: ShopTheme): string {
  const font = FONT_PAIRS[theme.font] ?? FONT_PAIRS.modern
  const fonts = `  --font-sans: ${font.body};\n  --font-display: ${font.display};\n`
  const dark = darkTokens(theme)
  return [
    block(':root', lightTokens(theme), fonts),
    `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme="light"])', dark)}}\n`,
    block(':root[data-theme="dark"]', dark),
  ].join('\n')
}

/**
 * Temani hujjatga qo'llaydi: CSS tokenlari, shrift va brauzer paneli
 * rangi. Qayta chaqirilsa eski uslub almashtiriladi (formadagi jonli
 * ko'rinish har rang tanlanganda shuni chaqiradi).
 */
export function applyShopTheme(theme: ShopTheme, doc: Document = document) {
  let style = doc.getElementById('shop-theme') as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = 'shop-theme'
    doc.head.appendChild(style)
  }
  style.textContent = themeCss(theme)

  const font = FONT_PAIRS[theme.font] ?? FONT_PAIRS.modern
  let link = doc.getElementById('shop-font') as HTMLLinkElement | null
  if (!link) {
    link = doc.createElement('link')
    link.id = 'shop-font'
    link.rel = 'stylesheet'
    doc.head.appendChild(link)
  }
  if (link.href !== font.href) link.href = font.href

  const meta = doc.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme.brand)
}

/** Faqat bir element ichida (formadagi telefon ko'rinishi) — hujjatga tegmaydi. */
export function scopedThemeStyle(theme: ShopTheme): Record<string, string> {
  const font = FONT_PAIRS[theme.font] ?? FONT_PAIRS.modern
  return {
    ...lightTokens(theme),
    '--font-sans': font.body,
    '--font-display': font.display,
  }
}
