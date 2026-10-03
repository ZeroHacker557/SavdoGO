import { platformApi } from '../../platform/api'
import { maskPhone } from './format'

/**
 * Forma SavdoGO botidan (Telegram mini app) ochilganda.
 *
 * Bu rejimda email va parol so'ralmaydi: kim ekanligini SavdoGO boti
 * imzolagan initData aytadi, telefon — botga yuborilgan kontakt
 * (Telegram tasdiqlagan). Server ikkalasini qayta tekshiradi
 * (api/_lib/platform/shops.ts → createWithTelegram).
 */

type WebApp = {
  initData?: string
  ready?: () => void
  expand?: () => void
  close?: () => void
  openLink?: (url: string) => void
  requestContact?: (callback?: (shared: boolean) => void) => void
  isVersionAtLeast?: (version: string) => boolean
}

export type TelegramOwner = {
  initData: string
  name: string
  /** «+998 90 123 45 67» — botga yuborilgan raqam; bo'lmasa null. */
  phone: string | null
  shop: { id: string; name: string } | null
}

function webApp(): WebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp
}

/** Sahifa Telegram mini app sifatida ochilganmi (SDK index.html da shunda yuklanadi). */
function launchedFromTelegram(): boolean {
  if (/tgWebApp/.test(window.location.hash)) return true
  try {
    return Boolean(sessionStorage.getItem('__telegram__initParams'))
  } catch {
    return false
  }
}

async function waitForInitData(timeoutMs = 3000): Promise<string> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const data = webApp()?.initData
    if (data) return data
    await new Promise((resolve) => window.setTimeout(resolve, 60))
  }
  return ''
}

/**
 * SavdoGO botidan ochilgan bo'lsa — ega ma'lumoti; aks holda null.
 * Boshqa botdan (masalan do'kon boti) ochilgan bo'lsa ham null: imzo
 * SavdoGO botiniki emas, oddiy forma ishlaydi.
 */
export async function loadTelegramOwner(): Promise<TelegramOwner | null> {
  if (!launchedFromTelegram()) return null
  const initData = await waitForInitData()
  if (!initData) return null
  const tg = webApp()
  tg?.ready?.()
  tg?.expand?.()
  try {
    const me = await platformApi<{ firstName: string; lastName: string | null; phone: string | null; shop: TelegramOwner['shop'] }>('tg.me', { initData })
    return {
      initData,
      name: [me.firstName, me.lastName].filter(Boolean).join(' '),
      phone: me.phone ? maskPhone(`+${me.phone}`) : null,
      shop: me.shop,
    }
  } catch (error) {
    console.warn('[telegram] SavdoGO boti tanimadi:', error)
    return null
  }
}

/** Telegram'ning «raqamni ulashish» oynasi. Raqam botga ham boradi (u saqlaydi). */
export function requestTelegramContact(): Promise<boolean> {
  const tg = webApp()
  if (!tg?.requestContact || !tg.isVersionAtLeast?.('6.9')) return Promise.resolve(false)
  return new Promise((resolve) => tg.requestContact?.((shared) => resolve(Boolean(shared))))
}

/** Havolani Telegram ichida emas, brauzerda ochish (do'kon sayti). */
export function openExternal(url: string) {
  const tg = webApp()
  if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank', 'noopener')
}

export function closeMiniApp() {
  webApp()?.close?.()
}
