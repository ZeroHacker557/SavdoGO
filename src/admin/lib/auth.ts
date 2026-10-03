import { initializeApp, getApps } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '../../config/firebase'

/**
 * Admin panel Firebase seansi.
 *
 * Mini app Telegram initData orqali custom token bilan kiradi; admin panel
 * esa oddiy email/parol bilan. Ikkalasi bir Firebase loyihasida, lekin
 * alohida sahifalar — seanslar bir-biriga aralashmaydi.
 */
const app = getApps()[0] ?? initializeApp(firebaseConfig)

/**
 * Seans IKKI joyda saqlanadi: avval IndexedDB, u ishlamasa localStorage.
 *
 * NEGA: panel Telegram ichida ham ochiladi. Telegram WebView'i
 * ba'zan localStorage'ni tozalab yuboradi — o'shanda admin har
 * ochganda qaytadan kirishga majbur bo'lardi. IndexedDB esa
 * saqlanib qoladi. Ro'yxat tartibi bilan beriladi: birinchisi
 * ishlamasa, keyingisiga tushadi.
 */
function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    })
  } catch {
    // Allaqachon yaratilgan bo'lsa (masalan HMR) — o'shani olamiz
    return getAuth(app)
  }
}

export const auth = createAuth()
export const db = getFirestore(app)

/** Kirishdan oldin kutiladi — saqlash usuli yuqorida tanlab bo'lingan. */
export const persistenceReady = Promise.resolve()

export type StaffRole = 'owner' | 'admin' | 'courier'

export type Staff = {
  uid: string
  email: string
  name: string
  role: StaffRole
  telegramId?: number | null
  phone?: string | null
  active: boolean
}

const RANK: Record<StaffRole, number> = { courier: 1, admin: 2, owner: 3 }

/** Rol yetarlimi? `owner` — `admin`ning, u esa `courier`ning hamma huquqiga ega. */
export function can(role: StaffRole | undefined, required: StaffRole): boolean {
  if (!role) return false
  return RANK[role] >= RANK[required]
}

export function watchUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function login(email: string, password: string) {
  await persistenceReady
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export function logout() {
  return signOut(auth)
}

/* ─── Parolsiz kirish (api/auth.ts → platform/tglogin.ts) ──────── */

export class PasswordlessError extends Error {
  constructor(message: string, readonly code: string = '') {
    super(message)
  }
}

async function authApi<T>(body: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new PasswordlessError('Tarmoqqa ulanib bo‘lmadi', 'network')
  }
  const json = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string }
  if (!response.ok) throw new PasswordlessError(json.error || `Kirib bo‘lmadi (${response.status})`, json.code || String(response.status))
  return json
}

async function signInWithToken(token: string) {
  await persistenceReady
  await signInWithCustomToken(auth, token)
}

/** Panel Telegram ichida: SavdoGO boti (ega) yoki do'kon boti (xodim) imzosi bilan. */
export async function loginWithTelegram(initData: string, shopId: string | null) {
  const { token } = await authApi<{ token: string }>({ mode: 'staff', initData, shopId })
  await signInWithToken(token)
}

/** Botdagi «💻 Kompyuterda ochish» havolasidagi bir martalik kod. */
export async function loginWithCode(loginCode: string) {
  const { token } = await authApi<{ token: string }>({ mode: 'code', loginCode })
  await signInWithToken(token)
}

export type TelegramLoginRequest = { nonce: string; code: string; botUsername: string; link: string; ttl: number }

/** Kompyuterdagi «Telegram orqali kirish»: botda tasdiqlanadigan so'rov. */
export function startTelegramLogin(): Promise<TelegramLoginRequest> {
  return authApi<TelegramLoginRequest>({ mode: 'request' })
}

/** So'rov tasdiqlanganmi — tasdiqlansa o'zi kiradi. */
export async function pollTelegramLogin(nonce: string): Promise<'pending' | 'approved' | 'expired'> {
  const result = await authApi<{ status: 'pending' | 'approved' | 'expired'; token?: string }>({ mode: 'poll', nonce })
  if (result.status === 'approved' && result.token) await signInWithToken(result.token)
  return result.status
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim())
}

/**
 * Firebase xatolarini tushunarli o'zbekcha matnga aylantiradi.
 * Xavfsizlik uchun "email yo'q" va "parol noto'g'ri" bitta xabar beradi —
 * aks holda qaysi email ro'yxatdan o'tganini tekshirib olish mumkin.
 */
export function authErrorText(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'Email manzili noto‘g‘ri'
    case 'auth/user-disabled':
      return 'Bu hisob bloklangan'
    case 'auth/too-many-requests':
      return 'Juda ko‘p urinish. Bir necha daqiqadan keyin qayta urinib ko‘ring'
    case 'auth/network-request-failed':
      return 'Tarmoqqa ulanib bo‘lmadi'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email yoki parol noto‘g‘ri'

    // Eng ko'p uchraydigan sozlash xatosi: Firebase Console'da
    // Email/Password provayderi yoqilmagan. Admin SDK hisob yarata
    // oladi, lekin brauzerdan kirish ishlamaydi — shuning uchun
    // "hisob yaratildi, lekin kira olmayapman" holati kelib chiqadi.
    case 'auth/operation-not-allowed':
      return 'Firebase Console → Authentication → Sign-in method da Email/Password yoqilmagan'

    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase config noto‘g‘ri (src/config/firebase.ts)'

    default:
      // Noma'lum xatoda kodni ko'rsatamiz — aks holda sababni
      // topish uchun brauzer konsolini ochish kerak bo'ladi.
      return code ? `Kirib bo‘lmadi (${code})` : 'Kirib bo‘lmadi. Qaytadan urinib ko‘ring'
  }
}
