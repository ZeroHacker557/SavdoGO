/**
 * «Bitta ega — bitta do'kon» qoidasi kiritilishidan OLDIN ochilgan
 * do'konlar uchun bir martalik to'ldirish.
 *
 * Yangi do'kon ochilganda egasining telefoni `ownerPhones/{998...}` ga
 * yoziladi va o'sha raqam bilan ikkinchi do'kon ochib bo'lmaydi. Eski
 * do'konlarda bu yozuv yo'q — skript ularni `shopPrivate` dan
 * to'ldiradi. Shuningdek `staffIndex/{uid}.shops` ro'yxatini qo'shadi
 * (do'konlar orasida almashtirish uchun).
 *
 * Faqat QO'SHADI, hech narsani o'chirmaydi va qayta ishga tushirsa
 * bo'ladi (bor yozuvlarga tegmaydi).
 *
 * Ishlatish:
 *   node scripts/backfill-owners.mjs           # nima yozilishini ko'rsatadi
 *   node scripts/backfill-owners.mjs --write   # yozadi
 */
import { connect } from './_firebase.mjs'

const write = process.argv.includes('--write')
const { db } = connect()

function phoneKey(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return /^998\d{9}$/.test(digits) ? digits : ''
}

const owners = await db.collection('shopPrivate').get()
let phones = 0
let indexes = 0
/** Shu ishga tushirishda band qilingan raqamlar (quruq rejimda ham takrorni ko'rsatish uchun). */
const claimed = new Map()

for (const doc of owners.docs) {
  const data = doc.data()
  const shopId = doc.id
  const uid = String(data.ownerUid || '')
  const key = phoneKey(data.ownerPhone)

  if (key) {
    const ref = db.collection('ownerPhones').doc(key)
    const existing = await ref.get()
    const holder = claimed.get(key) ?? (existing.exists ? existing.data().shopId : null)
    if (!holder) {
      console.log(`  + ownerPhones/${key} → ${shopId}`)
      phones++
      claimed.set(key, shopId)
      if (write) await ref.create({ uid, shopId, createdAt: String(data.createdAt || new Date().toISOString()) })
    } else if (holder !== shopId) {
      // Qoida kiritilishidan oldin bir raqam bilan bir nechta do'kon ochilgan — ular qoladi,
      // faqat shu raqam bilan YANGI do'kon ochib bo'lmaydi
      console.log(`  ! ${key} raqami bir nechta do‘konda: ${holder} va ${shopId} (ikkalasi ham ishlayveradi)`)
    }
  } else {
    console.log(`  ? ${shopId}: egasining telefoni yo‘q yoki noto‘g‘ri (${data.ownerPhone || '—'})`)
  }

  if (uid) {
    const ref = db.collection('staffIndex').doc(uid)
    const index = (await ref.get()).data()
    if (index && !Array.isArray(index.shops)) {
      console.log(`  + staffIndex/${uid}.shops = [${index.shopId}]`)
      indexes++
      if (write) await ref.set({ shops: [index.shopId] }, { merge: true })
    }
  }
}

console.log(`\nDo‘konlar: ${owners.size}. Telefon: ${phones} ta, indeks: ${indexes} ta ${write ? 'yozildi' : 'yoziladi'}.`)
if (!write && (phones || indexes)) console.log('Yozish uchun oxiriga --write qo‘shing.')
process.exit(0)
