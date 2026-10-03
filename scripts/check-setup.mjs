/**
 * Firebase loyihasi platformaga tayyormi — tekshiradi, HECH NARSANI
 * o'zgartirmaydi.
 *
 *   • Firestore bazasi yaratilganmi
 *   • Storage bucket bormi
 *   • Kirish usullari: Email/Password (do'kon egalari) va Anonymous (xaridorlar)
 *   • Firestore va Storage qoidalari shu loyihadagi fayllar bilan bir xilmi
 *   • Super-admin hisobi bormi
 *
 * Ishlatish:  node scripts/check-setup.mjs
 */
import { readFileSync } from 'node:fs'
import { cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { connect } from './_firebase.mjs'

const { projectId, key, auth, db } = connect()
const token = (await cert(key).getAccessToken()).access_token
const google = async (url) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

const ok = (m) => console.log(`  ✅ ${m}`)
const bad = (m) => console.log(`  ❌ ${m}`)
const warn = (m) => console.log(`  ⚠️  ${m}`)
let problems = 0
const fail = (m) => { bad(m); problems++ }

console.log('Firestore')
try {
  await db.collection('platform').doc('settings').get()
  ok('baza mavjud')
} catch (error) {
  fail(`bazaga ulanib bo‘lmadi — Firebase Console → Firestore Database → «Create database» (${error.code ?? ''} ${error.message.split('\n')[0]})`)
}

console.log('Storage')
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`
try {
  const [exists] = await getStorage().bucket(bucketName).exists()
  exists ? ok(`bucket: ${bucketName}`) : fail(`«${bucketName}» yo‘q — Firebase Console → Storage → «Get started»`)
} catch (error) {
  fail(`Storage tekshirilmadi: ${error.message.split('\n')[0]}`)
}

console.log('Kirish usullari (Authentication → Sign-in method)')
const config = await google(`https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`)
if (!config.ok) {
  fail(`Authentication yoqilmagan yoki o‘qib bo‘lmadi (${config.status}) — Console → Authentication → «Get started»`)
} else {
  const signIn = config.body.signIn ?? {}
  signIn.email?.enabled ? ok('Email/Password — do‘kon egalari va xodimlar') : fail('Email/Password yoqilmagan — do‘kon egalari kira olmaydi')
  signIn.anonymous?.enabled ? ok('Anonymous — xaridorlar') : fail('Anonymous yoqilmagan — xaridor buyurtma bera olmaydi')
  const domains = config.body.authorizedDomains ?? []
  console.log(`     Ruxsat etilgan domenlar: ${domains.join(', ') || '—'}`)
  if (!domains.includes('savdogo.shop')) warn('savdogo.shop ruxsat etilgan domenlar ro‘yxatida yo‘q (deploy qilganda qo‘shing)')
}

console.log('Xavfsizlik qoidalari')
const normalize = (s) => s.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()
for (const [service, file] of [['cloud.firestore', 'firestore.rules'], ['firebase.storage/' + bucketName, 'storage.rules']]) {
  const release = await google(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/${encodeURIComponent(service).replace('%2F', '/')}`)
  if (!release.ok) {
    fail(`${file}: deploy qilinmagan (${release.status})`)
    continue
  }
  const ruleset = await google(`https://firebaserules.googleapis.com/v1/${release.body.rulesetName}`)
  const live = ruleset.body.source?.files?.[0]?.content ?? ''
  const local = readFileSync(file, 'utf8')
  normalize(live) === normalize(local)
    ? ok(`${file} — loyihadagi bilan bir xil`)
    : fail(`${file} — Firebase'dagi qoidalar boshqacha (eski yoki «test mode»). Deploy qiling.`)
}

console.log('Super-admin')
const list = await auth.listUsers(1000)
const supers = list.users.filter((u) => u.customClaims?.super === true)
supers.length ? ok(supers.map((u) => u.email).join(', ')) : fail('yo‘q — node scripts/create-super.mjs <email> <parol>')

const shops = await db.collection('shops').count().get().catch(() => null)
if (shops) console.log(`\nDo‘konlar soni: ${shops.data().count}`)
console.log(problems ? `\n${problems} ta muammo topildi.` : '\nHammasi tayyor ✅')
process.exit(problems ? 1 : 0)
