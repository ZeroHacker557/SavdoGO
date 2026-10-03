import { adminAuth, adminBucket, adminDb } from '../firebase-admin.js'
import { disconnectBot } from './bot.js'
import { PlatformError } from './errors.js'

/**
 * Do'konni BUTUNLAY o'chirish — /super → do'kon → «Do'konni o'chirish».
 * (scripts/delete-shop.mjs xuddi shu ishni terminaldan qiladi.)
 *
 * O'chiriladi: shops/{id} va ichidagi hamma narsa, shopPrivate,
 * shopSecrets (do'kon botining webhook'i ham uziladi), to'lovlar, o'z
 * domeni yozuvi, xodimlarning Firebase hisoblari, egasining SavdoGO
 * botidagi bog'lanishi (tgUsers) va arizalari, Storage'dagi rasmlar.
 * Egasining telefoni bo'shaydi — u yana do'kon ocha oladi.
 *
 * Hisobda boshqa do'kon ham bo'lsa (ikkinchi do'kon arizasi bilan), u
 * hisob O'CHIRILMAYDI: faol do'koni boshqasiga o'tadi, telefoni o'sha
 * do'konga bog'lanadi.
 *
 * Qaytarib bo'lmaydi.
 */
export async function deleteShopCompletely(shopId: string) {
  const db = await adminDb()
  const auth = await adminAuth()
  const shopRef = db.collection('shops').doc(shopId)
  const shop = await shopRef.get()
  if (!shop.exists) throw new PlatformError('Do‘kon topilmadi', 404)
  const name = String(shop.data()?.name || shopId)
  const domain = typeof shop.data()?.customDomain === 'string' ? (shop.data()?.customDomain as string) : ''

  // 1. Do'kon boti — webhook uziladi, bot boshqa do'konga ulanishi mumkin bo'ladi
  await disconnectBot(shopId).catch((error) => console.warn('[delete] bot uzilmadi:', error))

  // 2. Xodimlar: boshqa do'koni bor hisob qoladi, qolganlari o'chiriladi
  const removed: string[] = []
  const kept = new Map<string, string>() // uid → yangi faol do'kon
  for (const doc of (await shopRef.collection('staff').get()).docs) {
    const indexRef = db.collection('staffIndex').doc(doc.id)
    const index = (await indexRef.get()).data()
    const others = [...new Set([index?.shopId, ...(Array.isArray(index?.shops) ? index.shops : [])])]
      .map((id) => String(id || ''))
      .filter((id) => id && id !== shopId)
    if (others.length) {
      const next = others[0]
      const member = await db.collection('shops').doc(next).collection('staff').doc(doc.id).get()
      const role = String(member.data()?.role || 'owner')
      await indexRef.set({ shopId: next, role, shops: others }, { merge: true })
      const user = await auth.getUser(doc.id).catch(() => null)
      if (user) await auth.setCustomUserClaims(doc.id, { ...(user.customClaims ?? {}), role, shopId: next })
      kept.set(doc.id, next)
      continue
    }
    await indexRef.delete()
    await auth.deleteUser(doc.id).catch(() => undefined) // Telegram-only kuryerda hisob yo'q
    removed.push(doc.id)
  }

  // 3. SavdoGO botidagi bog'lanish — aks holda bot uni «do'koni bor» deb biladi
  for (const uid of removed) {
    for (const tg of (await db.collection('tgUsers').where('uid', '==', uid).get()).docs) {
      await tg.ref.set({ uid: null, shopId: null, awaiting: null, updatedAt: new Date().toISOString() }, { merge: true })
    }
    for (const request of (await db.collection('shopRequests').where('ownerUid', '==', uid).get()).docs) {
      await request.ref.delete()
    }
  }

  // 4. Telefon: o'chirilgan ega — bo'shaydi; qolgan hisob — boshqa do'koniga o'tadi
  for (const phone of (await db.collection('ownerPhones').where('shopId', '==', shopId).get()).docs) {
    const next = kept.get(String(phone.data().uid || ''))
    if (next) await phone.ref.set({ shopId: next }, { merge: true })
    else await phone.ref.delete()
  }

  // 5. Qolgan yozuvlar va do'konning o'zi
  for (const payment of (await db.collection('payments').where('shopId', '==', shopId).get()).docs) await payment.ref.delete()
  if (domain) await db.collection('domains').doc(domain).delete()
  await db.collection('shopPrivate').doc(shopId).delete()
  await db.collection('shopSecrets').doc(shopId).delete()
  await db.recursiveDelete(shopRef)

  // 6. Rasmlar (logo, mahsulotlar, cheklar)
  try {
    const bucket = await adminBucket()
    await bucket.deleteFiles({ prefix: `shops/${shopId}/` })
    await bucket.deleteFiles({ prefix: `payments/${shopId}/` })
  } catch (error) {
    console.warn('[delete] Storage tozalanmadi:', error)
  }

  return { shopId, name, removedAccounts: removed.length, keptAccounts: kept.size }
}
