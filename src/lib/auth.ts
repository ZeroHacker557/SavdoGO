import {
  getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, type Auth, type User,
} from 'firebase/auth'
import { app } from './firebase'
import { isFirebaseConfigured } from '../config/firebase'
import { activeShop, isPreview } from '../shop/active'
import { getTelegram, isTelegramEnvironment } from '../utils/telegram'

/**
 * Xaridor kimligi.
 *
 *   Brauzer (asosiy yo'l) — Firebase ANONIM hisobi. Parol ham, SMS ham
 *   yo'q: mijoz buyurtmada ism va telefonini yozadi, hisob esa shu
 *   qurilmada saqlanadi — buyurtmalar tarixi, manzillar, savat.
 *
 *   Telegram mini app (qo'shimcha xizmat) — initData serverda do'kon
 *   botining tokeni bilan tekshiriladi va Custom Token olinadi
 *   (uid = Telegram id). Shunda bot mijozga xabar yubora oladi.
 *
 * Oldindan ko'rish rejimida (qoralama) hech qanday kirish bo'lmaydi.
 */
let authInstance: Auth | null = null

/**
 * Firebase Auth — kerak bo'lgandagina. Konfiguratsiya bo'sh bo'lsa
 * getAuth() darhol xato tashlaydi, oldindan ko'rish esa bazasiz ham
 * ishlashi kerak.
 */
function authOrNull(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (!authInstance) authInstance = getAuth(app)
  return authInstance
}

/**
 * `auth.currentUser` — shablondagi sahifalar shu ko'rinishda o'qiydi.
 * Haqiqiy Auth faqat kerak bo'lganda yaratiladi (authOrNull).
 */
export const auth = {
  get currentUser(): User | null {
    return authOrNull()?.currentUser ?? null
  },
}

/** Joriy mijozning uid'i (kirmagan bo'lsa null). */
export function currentUid(): string | null {
  return authOrNull()?.currentUser?.uid ?? null
}

async function signInTelegram(auth: Auth, initData: string): Promise<User | null> {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, shopId: activeShop().id }),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.error || `HTTP ${response.status}`)
  }
  const { token } = (await response.json()) as { token: string }
  const credential = await signInWithCustomToken(auth, token)
  return credential.user
}

let signInPromise: Promise<User | null> | null = null

/** Bir seansda bir marta: Telegram ichida — Telegram, aks holda anonim. */
export function ensureSignedIn(): Promise<User | null> {
  if (signInPromise) return signInPromise

  signInPromise = (async () => {
    const auth = authOrNull()
    if (!auth || isPreview()) return null
    await auth.authStateReady()

    const initData = isTelegramEnvironment() ? getTelegram()?.initData : ''
    const current = auth.currentUser

    try {
      // Telegram ichida, bot ulangan do'kon — Telegram hisobi (anonim bo'lsa almashtiriladi)
      if (initData && activeShop().botUsername && (!current || current.isAnonymous)) {
        return await signInTelegram(auth, initData)
      }
      if (current) return current
      const credential = await signInAnonymously(auth)
      return credential.user
    } catch (error) {
      console.error('[Auth] tizimga kirib bo‘lmadi:', error)
      // Telegram yo'li yiqilsa ham mijoz anonim sifatida xarid qila olsin
      if (initData && !auth.currentUser) {
        try {
          return (await signInAnonymously(auth)).user
        } catch {
          /* quyida null */
        }
      }
      signInPromise = null
      return auth.currentUser
    }
  })()

  return signInPromise
}

/** Joriy foydalanuvchining ID tokeni — API so'rovlari uchun. */
export async function getIdToken(): Promise<string | null> {
  const user = authOrNull()?.currentUser ?? (await ensureSignedIn())
  if (!user) return null
  return user.getIdToken()
}

export function onAuthChanged(callback: (user: User | null) => void) {
  const auth = authOrNull()
  if (!auth || isPreview()) {
    const timer = setTimeout(() => callback(null), 0)
    return () => clearTimeout(timer)
  }
  return onAuthStateChanged(auth, callback)
}
