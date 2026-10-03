/**
 * Platforma API'si — POST /api/platform { action, ... }.
 *
 * Ro'yxatdan o'tish (do'kon yaratish), subdomen bandligini tekshirish,
 * to'lov cheki yuborish va super-admin amallari shu bitta funksiyadan
 * o'tadi (Vercel Hobby rejasida funksiyalar soni cheklangan).
 */
export class PlatformApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'PlatformApiError'
  }
}

/** `vite dev` serverless funksiyalarni ishga tushirmaydi — shu holatni ajratamiz. */
export function isApiMissing(error: unknown): boolean {
  return error instanceof PlatformApiError && error.code === 'api-missing'
}

export async function platformApi<T>(action: string, body: Record<string, unknown> = {}, token?: string | null): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/platform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, ...body }),
    })
  } catch {
    throw new PlatformApiError('Internetga ulanib bo‘lmadi. Aloqani tekshiring.', 0, 'network')
  }

  const payload = (await response.json().catch(() => null)) as { error?: string; code?: string } | null

  if (payload === null) {
    // JSON o'rniga HTML keldi — /api ishlamayapti (lokal `vite dev`)
    throw new PlatformApiError(
      'Server javob bermadi (/api topilmadi). Saytni `npm run dev` bilan ishga tushiring yoki deploy qilingan manzildan foydalaning.',
      response.status,
      'api-missing',
    )
  }

  if (!response.ok) {
    throw new PlatformApiError(payload.error || `Server xatosi (${response.status})`, response.status, payload.code)
  }
  return payload as T
}
