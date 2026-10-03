import { auth } from './auth'

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Server sababi: `payment-required`, `shop-blocked`... */
    readonly code?: string,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

/**
 * To'lanmagan do'konda amal bajarilmoqchi bo'lsa server 402 qaytaradi.
 * Panel buni bitta joyda ushlaydi va «To'lov qiling» oynasini ochadi
 * (components/Paywall.tsx) — har sahifa buni alohida bilishi shart emas.
 */
export const PAYWALL_EVENT = 'savdogo:paywall'

/** «Telegram va kuryerlar» to'plamisiz kuryer amali — components/AddonTeaser.tsx → AddonModal. */
export const ADDON_EVENT = 'savdogo:addon'

/**
 * `/api/admin/*` ga imzolangan so'rov.
 *
 * Har chaqiruvda yangi ID token olinadi — Firebase uni keshlaydi va faqat
 * muddati tugaganda qayta so'raydi, shuning uchun bu qimmat emas. Buning
 * evaziga xodim bloklangach, keyingi so'rovdayoq 403 qaytadi.
 */
async function request<T>(path: string, init: RequestInit = {}, forceToken = false): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new AdminApiError('Tizimga kirilmagan', 401)

  const token = await user.getIdToken(forceToken)
  const response = await fetch(path.startsWith('/') ? path : `/api/admin/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })

  /*
   * 401 — token eskirgan yoki bekor qilingan.
   *
   * Ilova uzoq yopiq turgandan keyin ochilganda (masalan Telegram
   * ichida) keshdagi token muddati o'tgan bo'lishi mumkin. Bir marta
   * MAJBURIY yangilab qayta urinamiz — admin uchun hech narsa
   * o'zgarmaydi, ilgari esa «ruxsat berilmadi» chiqardi.
   */
  if (response.status === 401 && !forceToken) {
    return request<T>(path, init, true)
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    /* JSON emas — quyida aniqlashtiramiz */
  }

  if (!response.ok) {
    // `vite dev` serverless funksiyalarni ishga tushirmaydi: /api/* so'rovi
    // index.html ga tushib, JSON o'rniga HTML qaytadi. Buni alohida
    // xabar bilan ajratamiz, aks holda "Server xatosi (404)" deb ko'rinadi
    // va sabab noaniq qoladi.
    if (payload === null && response.status === 404) {
      throw new AdminApiError(
        'API topilmadi. Saytni `npm run dev` bilan ishga tushiring yoki deploy qilingan manzildan kiring.',
        404,
      )
    }
    const message =
      (payload as { error?: string })?.error || `Server xatosi (${response.status})`
    const code = (payload as { code?: string })?.code
    if (code === 'payment-required') window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: message }))
    if (code === 'addon-required') window.dispatchEvent(new CustomEvent(ADDON_EVENT, { detail: message }))
    throw new AdminApiError(message, response.status, code)
  }

  // Status 200, lekin JSON emas — bu ham API o'rniga HTML kelgani
  if (payload === null) {
    throw new AdminApiError(
      'API javobi tushunarsiz — server to‘g‘ri ishga tushganini tekshiring.',
      502,
    )
  }

  return payload as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
