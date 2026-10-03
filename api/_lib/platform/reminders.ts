import { adminDb } from '../firebase-admin.js'
import { esc, notifyPlatform } from './notify.js'

const DAY = 86_400_000

/**
 * Obunasi yaqin kunlarda tugaydigan do'konlar.
 *
 * Do'kon egasi admin panelda sariq ogohlantirishni o'zi ko'radi
 * (Shell → «Obuna N kundan keyin tugaydi»). Bu yerda esa platforma
 * egasiga kunlik ro'yxat ketadi — kerak bo'lsa qo'ng'iroq qilish uchun.
 * Har do'kon uchun eslatma bir marta yoziladi (`reminderSentFor`).
 */
export async function remindExpiring(): Promise<{ soon: number; expired: number }> {
  const db = await adminDb()
  const snap = await db.collection('shops').where('status', '==', 'active').get()
  const now = Date.now()
  const soon: string[] = []
  let expired = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const until = typeof data.paidUntil === 'string' ? new Date(data.paidUntil).getTime() : NaN
    if (!Number.isFinite(until)) continue
    if (until <= now) {
      expired++
      continue
    }
    if (until - now > 3 * DAY) continue
    if (data.reminderSentFor === data.paidUntil) continue
    const days = Math.max(1, Math.ceil((until - now) / DAY))
    soon.push(`• ${esc(String(data.name || doc.id))} (${doc.id}) — ${days} kun${data.trial === true ? ' · bepul sinov' : ''}`)
    await doc.ref.set({ reminderSentFor: data.paidUntil }, { merge: true })
  }

  if (soon.length) {
    await notifyPlatform(['⏰ <b>Obunasi tugayotgan do‘konlar</b>', ...soon].join('\n'))
  }
  return { soon: soon.length, expired }
}
