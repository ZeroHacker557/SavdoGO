/**
 * Do'konni BUTUNLAY o'chiradi — sinov do'konlarini tozalash uchun.
 *
 * O'chiriladi: shops/{id} va ichidagi hamma narsa (mahsulotlar,
 * buyurtmalar, mijozlar, xodimlar...), shopPrivate, shopSecrets,
 * to'lovlar, o'z domeni yozuvi, egasining telefon band qilinishi
 * (ownerPhones), xodimlarning Firebase hisoblari va Storage'dagi
 * rasmlar. Subdomen shundan keyin yana bo'sh bo'ladi.
 *
 * Hisobda boshqa do'kon ham bo'lsa (ikkinchi do'kon arizasi bilan
 * ochilgan), u hisob O'CHIRILMAYDI — boshqa do'koni faol bo'lib qoladi.
 *
 * Ishlatish:
 *   node scripts/delete-shop.mjs <id>            # nima o'chishini ko'rsatadi
 *   node scripts/delete-shop.mjs <id> --delete   # o'chiradi
 *
 * DIQQAT: qaytarib bo'lmaydi.
 */
import { getStorage } from 'firebase-admin/storage'
import { connect } from './_firebase.mjs'

const [, , shopId, flag] = process.argv
if (!shopId) {
  console.error('Ishlatish: node scripts/delete-shop.mjs <id> [--delete]')
  process.exit(1)
}

const { projectId, auth, db } = connect()
const shopRef = db.collection('shops').doc(shopId)
const shop = await shopRef.get()
if (!shop.exists) {
  console.error(`«${shopId}» do‘koni topilmadi.`)
  process.exit(1)
}

const staff = await shopRef.collection('staff').get()
const payments = await db.collection('payments').where('shopId', '==', shopId).get()
const domain = shop.data().customDomain
const collections = await shopRef.listCollections()

console.log(`Do‘kon: ${shop.data().name} (${shopId}), holat: ${shop.data().status}`)
for (const col of collections) {
  const count = (await col.count().get()).data().count
  console.log(`  • ${col.id}: ${count} ta hujjat`)
}
console.log(`  • xodimlar hisobi: ${staff.size}, to‘lovlar: ${payments.size}${domain ? `, domen: ${domain}` : ''}`)

if (flag !== '--delete') {
  console.log('\nHech narsa o‘chirilmadi. O‘chirish uchun oxiriga --delete qo‘shing.')
  process.exit(0)
}

for (const doc of staff.docs) {
  const indexRef = db.collection('staffIndex').doc(doc.id)
  const index = (await indexRef.get()).data()
  // Hisobda boshqa do'kon ham bo'lsa (ikkinchi do'kon arizasi) — hisob qoladi,
  // faqat shu do'kon ro'yxatdan chiqadi va boshqasi faol bo'ladi
  const others = [...new Set([index?.shopId, ...(Array.isArray(index?.shops) ? index.shops : [])])]
    .filter((id) => id && id !== shopId)
  if (others.length) {
    const next = others[0]
    const member = await db.collection('shops').doc(next).collection('staff').doc(doc.id).get()
    const role = member.data()?.role || 'owner'
    await indexRef.set({ shopId: next, role, shops: others }, { merge: true })
    const user = await auth.getUser(doc.id).catch(() => null)
    if (user) await auth.setCustomUserClaims(doc.id, { ...(user.customClaims ?? {}), role, shopId: next })
    console.log(`  • ${doc.id}: hisob saqlandi, faol do‘kon → ${next}`)
    continue
  }
  await indexRef.delete()
  await auth.deleteUser(doc.id).catch(() => undefined) // Telegram-only kuryerda hisob yo'q
}
// Egasining telefoni bo'shaydi — u yana do'kon ocha oladi
const phones = await db.collection('ownerPhones').where('shopId', '==', shopId).get()
for (const doc of phones.docs) await doc.ref.delete()
for (const doc of payments.docs) await doc.ref.delete()
if (domain) await db.collection('domains').doc(domain).delete()
await db.collection('shopPrivate').doc(shopId).delete()
await db.collection('shopSecrets').doc(shopId).delete()
await db.recursiveDelete(shopRef)

const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`)
await bucket.deleteFiles({ prefix: `shops/${shopId}/` }).catch((error) => console.warn('Storage:', error.message))
await bucket.deleteFiles({ prefix: `payments/${shopId}/` }).catch((error) => console.warn('Storage:', error.message))

console.log(`\n✅ «${shopId}» butunlay o‘chirildi.`)
process.exit(0)
