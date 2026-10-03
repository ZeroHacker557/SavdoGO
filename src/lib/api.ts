import { getIdToken } from './auth'
import { activeShopId, isPreview } from '../shop/active'

export class ApiError extends Error {
  status: number
  /** Serverdagi sabab kodi — ilova uni o'z tilida ko'rsatadi. */
  code?: string
  /** Matnga qo'yiladigan qiymatlar, masalan `{ amount: 150000 }`. */
  params?: Record<string, string | number>

  constructor(
    message: string,
    status: number,
    code?: string,
    params?: Record<string, string | number>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.params = params
  }
}

/**
 * Serverdagi funksiyaga so'rov. Har safar yangi ID token olinadi —
 * Firebase uni avtomatik yangilab beradi.
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  // Oldindan ko'rish (qoralama) — server yo'q, buyurtma berib bo'lmaydi
  if (isPreview()) throw new ApiError('Bu — oldindan ko‘rish rejimi', 403, 'PREVIEW')

  const token = await getIdToken()
  if (!token) {
    throw new ApiError('Tizimga kirib bo‘lmadi. Sahifani yangilab, qayta urinib ko‘ring.', 401)
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // Qaysi do'kon — server shu bo'yicha shops/{id} ichida ishlaydi
        'x-shop-id': activeShopId(),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError("Internetga ulanib bo'lmadi. Aloqani tekshiring.", 0)
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      "So'rov bajarilmadi, qayta urinib ko'ring"
    const code = payload && typeof payload.code === 'string' ? payload.code : undefined
    const params = payload && payload.params && typeof payload.params === 'object'
      ? (payload.params as Record<string, string | number>)
      : undefined
    throw new ApiError(message, response.status, code, params)
  }

  return payload as T
}
