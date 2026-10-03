import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '../../config/firebase'

/**
 * Do'kon yaratilgach egani darhol tizimga kiritadi.
 *
 * Admin panel (/admin) shu domenda va shu Firebase ilovasida — seans
 * IndexedDB'da umumiy, shuning uchun «Admin panelga o'tish» bosilganda
 * qayta parol so'ralmaydi. Kira olmasa ham xato ko'tarmaydi: ega
 * panelda email/parol bilan o'zi kiradi.
 */
export async function signInOwner(email: string, password: string): Promise<boolean> {
  if (!isFirebaseConfigured()) return false
  try {
    const app = getApps()[0] ?? initializeApp(firebaseConfig)
    await signInWithEmailAndPassword(getAuth(app), email, password)
    return true
  } catch (error) {
    console.warn('[onboarding] avtomatik kirish bo‘lmadi:', error)
    return false
  }
}

export type OwnerSession = { uid: string; email: string; name: string; role: string; shopId: string; token: string }

/**
 * Shu brauzerda admin panelga kirgan xodim (agar bo'lsa).
 *
 * Forma ochilganda tekshiriladi: do'kon egasi /start ga qaytsa — ikkinchi
 * do'kon formasini emas, «sizda do'kon bor» ekranini ko'radi; tasdiqlangan
 * ariza bilan kelsa — yangi do'kon shu hisobga qo'shiladi. Do'kon sayti
 * xaridorlarining anonim seansi hisobga olinmaydi.
 */
export async function currentStaffSession(): Promise<OwnerSession | null> {
  if (!isFirebaseConfigured()) return null
  try {
    const auth = getAuth(getApps()[0] ?? initializeApp(firebaseConfig))
    await auth.authStateReady()
    const user = auth.currentUser
    if (!user || user.isAnonymous) return null
    const result = await user.getIdTokenResult()
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: user.displayName ?? '',
      role: String(result.claims.role ?? ''),
      shopId: String(result.claims.shopId ?? ''),
      token: result.token,
    }
  } catch {
    return null
  }
}

/** Yangi do'kon qo'shilgach token claim'i yangilansin — panel yangi do'konni ochadi. */
export async function refreshStaffToken(): Promise<void> {
  try {
    await getAuth(getApps()[0] ?? initializeApp(firebaseConfig)).currentUser?.getIdToken(true)
  } catch {
    /* panel kirishda baribir yangilaydi */
  }
}
