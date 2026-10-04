import { adminAuth, adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { shopsOfIndex } from '../platform/owners.js'
import { createLoginLink } from '../platform/tglogin.js'

/**
 * «Hisobim» — zaxira kirish usullari (admin panel → src/admin/pages/AccountPage.tsx).
 *
 * Google va email brauzerda Firebase'ning o'zida ulanadi; bu yerda
 * faqat ikki yordamchi amal:
 *   account.sync      — ulangan email do'kon yozuvlariga yoziladi (xodimlar
 *                       ro'yxati, /super dagi ega emaili)
 *   account.loginLink — Telegram ichidan panelni brauzerda kirilgan holda
 *                       ochish (Google oynasi Telegram ichida ishlamaydi)
 */

export async function accountSync(staff: Staff) {
  const user = await (await adminAuth()).getUser(staff.uid)
  const email = (user.email || user.providerData.find((p) => p.email)?.email || '').toLowerCase()
  if (!email) return { email: null }

  const db = await adminDb()
  const index = (await db.collection('staffIndex').doc(staff.uid).get()).data()
  const shops = shopsOfIndex(index)
  if (!shops.includes(staff.shopId)) shops.push(staff.shopId)

  for (const shopId of shops) {
    const ref = db.collection('shops').doc(shopId).collection('staff').doc(staff.uid)
    const member = (await ref.get()).data()
    if (!member) continue
    await ref.set({ email }, { merge: true })
    if (member.role === 'owner') await db.collection('shopPrivate').doc(shopId).set({ ownerEmail: email }, { merge: true })
  }
  return { email }
}

/** Panelni brauzerda ochish: 10 daqiqalik bir martalik havola, «Hisobim» bo'limiga. */
export async function accountLoginLink(staff: Staff) {
  const url = await createLoginLink(staff.uid)
  return { url: `${url}&open=account` }
}
