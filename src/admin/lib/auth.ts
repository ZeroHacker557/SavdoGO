import { initializeApp, getApps } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithCredential,
  linkWithPopup,
  getAdditionalUserInfo,
  EmailAuthProvider,
  GoogleAuthProvider,
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

/* ─── Zaxira kirish usullari: Google va email ─────────────────
 *
 * Telegram orqali ochilgan egada email/parol yo'q. Telefon va Telegram
 * yo'qolsa ham do'konga kira olishi uchun «Hisobim» bo'limida o'z
 * hisobiga Google yoki email+parol ulaydi (Firebase — bitta hisob,
 * bir nechta kirish usuli). Google oynasi Telegram ichida ishlamaydi —
 * faqat brauzerda.
 */

/** Kirishdan oldin Google hisobi bog'lanmagan bo'lsa — kirish sahifasida ko'rinadigan sabab. */
export const LOGIN_NOTICE_KEY = 'adm-login-notice'

export class GoogleNotLinkedError extends Error {}

/**
 * «Google bilan kirish». Google hisobi hech bir xodimga ulanmagan bo'lsa,
 * Firebase yangi bo'sh hisob ochib yuboradi — uni darhol o'chiramiz va
 * tushunarli sabab qoldiramiz.
 */
export async function loginWithGoogle() {
  await persistenceReady
  const credential = await signInWithPopup(auth, new GoogleAuthProvider())
  if (getAdditionalUserInfo(credential)?.isNewUser) {
    const text = 'Bu Google hisobi hech qaysi do‘konga ulanmagan. Avval Telegram orqali kiring va «Hisobim» bo‘limida Google’ni ulang.'
    try {
      sessionStorage.setItem(LOGIN_NOTICE_KEY, text)
    } catch {
      /* sessionStorage yopiq */
    }
    await credential.user.delete().catch(() => signOut(auth))
    throw new GoogleNotLinkedError(text)
  }
}

/** Joriy hisobga Google'ni ulash (brauzerda). */
export async function linkGoogle() {
  if (!auth.currentUser) throw new Error('Avval tizimga kiring')
  await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
}

/** Joriy hisobga email va parol ulash — keyin istalgan brauzerdan shu bilan kirasiz. */
export async function linkEmail(email: string, password: string) {
  if (!auth.currentUser) throw new Error('Avval tizimga kiring')
  await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim().toLowerCase(), password))
}

/** Hisobga ulangan usullar: 'google.com', 'password'. */
export function linkedProviders(user: User | null = auth.currentUser): { google: string | null; email: string | null } {
  const data = user?.providerData ?? []
  return {
    google: data.find((p) => p.providerId === 'google.com')?.email ?? null,
    email: data.find((p) => p.providerId === 'password')?.email ?? null,
  }
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
      return 'Bu kirish usuli hali yoqilmagan (Firebase Console → Authentication → Sign-in method). Platforma egasiga ayting.'

    // Google va email ulash
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Oyna yopildi — qayta urinib ko‘ring'
    case 'auth/popup-blocked':
      return 'Brauzer oynani to‘sib qo‘ydi — qalqib chiquvchi oynalarga ruxsat bering'
    case 'auth/credential-already-in-use':
      return 'Bu Google hisobi boshqa hisobga ulangan'
    case 'auth/email-already-in-use':
      return 'Bu email boshqa hisobda ishlatilgan — boshqasini kiriting'
    case 'auth/provider-already-linked':
      return 'Bu usul allaqachon ulangan'
    case 'auth/weak-password':
      return 'Parol juda oddiy — kamida 8 ta belgi'
    case 'auth/requires-recent-login':
      return 'Xavfsizlik uchun chiqib, qayta kiring va yana urinib ko‘ring'
    case 'auth/account-exists-with-different-credential':
      return 'Bu email bilan hisob bor — email va parol bilan kiring'
    case 'auth/unauthorized-domain':
      return 'Bu sayt Firebase’da ruxsat etilmagan (Authorized domains). Platforma egasiga ayting.'

    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase config noto‘g‘ri (src/config/firebase.ts)'

    default:
      // Noma'lum xatoda kodni ko'rsatamiz — aks holda sababni
      // topish uchun brauzer konsolini ochish kerak bo'ladi.
      return code ? `Kirib bo‘lmadi (${code})` : 'Kirib bo‘lmadi. Qaytadan urinib ko‘ring'
  }
}
