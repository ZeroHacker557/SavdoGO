/**
 * Firebase mijoz (web) konfiguratsiyasi — SavdoGO platformasi.
 *
 * Bu qiymatlar MAXFIY EMAS — Firebase ularni brauzerga ataylab ochiq
 * beradi, himoya Firestore Rules tomonida. Shuning uchun env emas,
 * oddiy konstanta.
 *
 * Loyiha: savdogo-aac7a. Qiymatlar manbai:
 *   Firebase Console → ⚙️ Project Settings → General → Your apps →
 *   Web app → SDK setup and configuration → Config.
 *
 * Server tomoni (api/*) shu loyihaning service account JSON'ini
 * FIREBASE_SERVICE_ACCOUNT env'dan oladi — ikkalasi BIR loyiha bo'lsin.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAhuXdmEKpFCcUFl4Vh7ZPalcqyxtH_z00',
  authDomain: 'savdogo-aac7a.firebaseapp.com',
  projectId: 'savdogo-aac7a',
  storageBucket: 'savdogo-aac7a.firebasestorage.app',
  messagingSenderId: '1024898135902',
  appId: '1:1024898135902:web:b8a51f61ca2c45446641cf',
}

/** Konfiguratsiya to'ldirilganmi — bo'lmasa sayt bazaga umuman murojaat qilmaydi. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}
